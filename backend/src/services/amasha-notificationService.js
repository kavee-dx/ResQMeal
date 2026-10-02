const Notification = require("../models/amasha-Notification");
const User = require("../models/dushani-User");
const { NOTIFICATION_EVENTS } = require("../constants/amasha-notificationEvents");

const BROADCAST_BATCH_SIZE = 500;

/**
 * Create one notification per user for an event.
 *
 *   await notify("REQUEST_ACCEPTED", [request.recipient], {
 *     requestId: request._id,
 *     foodType: request.foodType,
 *   });
 *
 * @returns {Promise<{created: number}>}
 */
async function notify(type, userIds, data = {}) {
  try {
    const event = NOTIFICATION_EVENTS[type];
    if (!event) {
      console.error(`notify: unknown notification type "${type}"`);
      return { created: 0 };
    }

    const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
    if (!ids.length) return { created: 0 };

    const { title, body } = event.build(data);
    const dedupeKey = event.dedupe ? event.dedupe(data) : undefined;
    const targetId = data[event.target.idKey];

    const docs = ids.map((userId) => ({
      userId,
      type,
      category: event.category,
      priority: event.priority,
      title,
      body,
      target: { type: event.target.type, id: targetId ? String(targetId) : undefined },
      data,
      dedupeKey,
    }));

    const inserted = await Notification.insertMany(docs, { ordered: false });
    return { created: inserted.length };
  } catch (error) {
    // Duplicate-key errors just mean some users already had this notification.
    if (error && (error.code === 11000 || error.writeErrors)) {
      return { created: error.result?.insertedCount ?? 0 };
    }
    console.error(`notify(${type}) failed:`, error);
    return { created: 0 };
  }
}

/**
 * Send one event to every active user in the given roles (used for
 * CAMPAIGN_PUBLISHED). Roles default to the event's own audience.
 */
async function notifyRoles(type, data = {}, options = {}) {
  try {
    const event = NOTIFICATION_EVENTS[type];
    if (!event) {
      console.error(`notifyRoles: unknown notification type "${type}"`);
      return { created: 0 };
    }

    const roles = options.roles || event.roles;
    const query = { role: { $in: roles }, accountStatus: "active" };
    if (options.excludeUserIds?.length) query._id = { $nin: options.excludeUserIds };

    const users = await User.find(query).select("_id").lean();

    let created = 0;
    for (let i = 0; i < users.length; i += BROADCAST_BATCH_SIZE) {
      const batch = users.slice(i, i + BROADCAST_BATCH_SIZE).map((u) => u._id);
      const result = await notify(type, batch, data);
      created += result.created;
    }
    return { created };
  } catch (error) {
    console.error(`notifyRoles(${type}) failed:`, error);
    return { created: 0 };
  }
}

module.exports = { notify, notifyRoles };
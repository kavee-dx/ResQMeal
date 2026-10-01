const mongoose = require('mongoose');

/**
 *
 * Only the four SERVICE modules below are auto-mocked here — and only because the
 * controllers destructure their functions at load time
 * (`const { createFoodRequest } = require('../services/...')`), so a
 * jest.mock() declared at the top of the file (hoisted before any requires)
 * is the only reliable way to intercept what the controllers call.
 *
 * The FoodRequest MODEL is never auto-mocked. Model tests use it directly,
 * and the "real" service tests below control its behavior with
 * jest.spyOn(FoodRequest, 'create' / 'find'), restored after each test.
 * jest.requireActual() is used to get the true (unmocked) service
 * implementations for those tests, even though the module is auto-mocked
 * for the controller tests further down.
 */

jest.mock('../../src/services/dushani-createFoodRequestService');
jest.mock('../../src/services/dushani-requestStatusService');
jest.mock('../../src/services/dushani-deleteFoodRequestService');
jest.mock('../../src/services/dushani-cancelFoodRequestService');
jest.mock('../../src/services/dushani-requestHistoryService');

const FoodRequest = require('../../src/models/dushani-foodRequestModel');

// Auto-mocked versions — this is what the controllers under test actually call.
const mockedCreateService = require('../../src/services/dushani-createFoodRequestService');
const mockedStatusService = require('../../src/services/dushani-requestStatusService');
const mockedDeleteService = require('../../src/services/dushani-deleteFoodRequestService');
const mockedCancelService = require('../../src/services/dushani-cancelFoodRequestService');
const mockedHistoryService = require('../../src/services/dushani-requestHistoryService');

// Real, unmocked implementations — used to test the service layer itself.
const { createFoodRequest } = jest.requireActual('../../src/services/dushani-createFoodRequestService');
const { getRequestsByRecipient } = jest.requireActual('../../src/services/dushani-requestStatusService');
const { deleteFoodRequest } = jest.requireActual('../../src/services/dushani-deleteFoodRequestService');
const { cancelFoodRequest } = jest.requireActual('../../src/services/dushani-cancelFoodRequestService');
const { getRequestHistory } = jest.requireActual('../../src/services/dushani-requestHistoryService');

const { createFoodRequestHandler } = require('../../src/controllers/dushani-createFoodRequestController');
const { getMyRequestsHandler } = require('../../src/controllers/dushani-requestStatusController');
const { deleteFoodRequestHandler } = require('../../src/controllers/dushani-deleteFoodRequestController');
const { cancelFoodRequestHandler } = require('../../src/controllers/dushani-cancelFoodRequestController');
const { getMyRequestHistoryHandler } = require('../../src/controllers/dushani-requestHistoryController');

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// Task 12 — Food Request model
// ---------------------------------------------------------------------------
describe('FoodRequest model (Task 12)', () => {
  const baseData = {
    recipient: new mongoose.Types.ObjectId(),
    foodType: 'Rice',
    quantity: '5 kg',
    location: 'Colombo 05',
  };

  it('defaults urgency to NORMAL when not provided', () => {
    const doc = new FoodRequest(baseData);
    expect(doc.urgency).toBe('NORMAL');
  });

  it('defaults priority to HIGH when urgency is URGENT', () => {
    const doc = new FoodRequest({ ...baseData, urgency: 'URGENT' });
    expect(doc.priority).toBe('HIGH');
  });

  it('defaults priority to NORMAL when urgency is NORMAL', () => {
    const doc = new FoodRequest(baseData);
    expect(doc.priority).toBe('NORMAL');
  });

  it('defaults status to PENDING', () => {
    const doc = new FoodRequest(baseData);
    expect(doc.status).toBe('PENDING');
  });

  it('sets expiresAt ~5 hours out for urgent requests', () => {
    const doc = new FoodRequest({ ...baseData, urgency: 'URGENT' });
    const hoursUntilExpiry = (doc.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursUntilExpiry).toBeGreaterThan(4.9);
    expect(hoursUntilExpiry).toBeLessThanOrEqual(5);
  });

  it('sets expiresAt ~24 hours out for normal requests', () => {
    const doc = new FoodRequest(baseData);
    const hoursUntilExpiry = (doc.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursUntilExpiry).toBeGreaterThan(23.9);
    expect(hoursUntilExpiry).toBeLessThanOrEqual(24);
  });

  it('fails validation when required fields are missing', () => {
    const doc = new FoodRequest({ recipient: baseData.recipient });
    const error = doc.validateSync();
    expect(error.errors.foodType).toBeDefined();
    expect(error.errors.quantity).toBeDefined();
    expect(error.errors.location).toBeDefined();
  });

  it('rejects an invalid urgency value', () => {
    const doc = new FoodRequest({ ...baseData, urgency: 'SOMEDAY' });
    const error = doc.validateSync();
    expect(error.errors.urgency).toBeDefined();
  });

  it('rejects an invalid status value', () => {
    const doc = new FoodRequest({ ...baseData, status: 'ON_ITS_WAY' });
    const error = doc.validateSync();
    expect(error.errors.status).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Task 11 (backend) — createFoodRequest service, real implementation
// ---------------------------------------------------------------------------
describe('createFoodRequest service (Task 11 backend support)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a food request when all required fields are present', async () => {
    const createSpy = jest.spyOn(FoodRequest, 'create').mockResolvedValue({ id: 'req1' });
    const preferredAt = new Date(Date.now() + 6 * 3_600_000);

    const result = await createFoodRequest({
      recipientId: 'recipient1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
      details: '',
      contactNumber: '077 123 4567',
      urgency: 'NORMAL',
      preferredAt,
    });

    // The time the recipient asked for doubles as the expiry, so no expiresAt
    // is written by the schema default.
    expect(createSpy).toHaveBeenCalledWith({
      recipient: 'recipient1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
      details: '',
      contactNumber: '0771234567',
      urgency: 'NORMAL',
      preferredAt,
      expiresAt: preferredAt,
    });
    expect(result).toEqual({ id: 'req1' });
  });

  it.each([
    ['empty', ''],
    ['too short', '077123456'],
    ['unknown prefix', '0731234567'],
  ])('throws a 400 error when contactNumber is %s', async (_label, contactNumber) => {
    const createSpy = jest.spyOn(FoodRequest, 'create');

    await expect(
      createFoodRequest({
        recipientId: 'recipient1',
        foodType: 'Rice',
        quantity: '5 kg',
        location: 'Colombo 05',
        contactNumber,
        preferredAt: new Date(Date.now() + 6 * 3_600_000),
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it.each(['foodType', 'quantity', 'location'])('throws a 400 error when %s is missing', async (field) => {
    const createSpy = jest.spyOn(FoodRequest, 'create');
    const payload = {
      recipientId: 'recipient1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
    };
    delete payload[field];

    await expect(createFoodRequest(payload)).rejects.toMatchObject({ statusCode: 400 });
    expect(createSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Task 13 (backend) — getRequestsByRecipient service, real implementation
// ---------------------------------------------------------------------------
describe('getRequestsByRecipient service (Task 13 backend support)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queries requests for the given recipient sorted by newest first', async () => {
    const docs = [
      { _id: 'r1', status: 'MATCHED' },
      { _id: 'r2', status: 'PENDING', expiresAt: new Date('2020-01-01T00:00:00.000Z') },
    ];
    const leanMock = jest.fn().mockResolvedValue(docs);
    const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
    jest.spyOn(FoodRequest, 'find').mockReturnValue({ sort: sortMock });

    const result = await getRequestsByRecipient('recipient1');

    expect(FoodRequest.find).toHaveBeenCalledWith({ recipient: 'recipient1' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(leanMock).toHaveBeenCalled();
    expect(result.map((request) => request._id)).toEqual(['r1', 'r2']);
  });

  it('reports a past-expiry pending request as EXPIRED', async () => {
    const leanMock = jest.fn().mockResolvedValue([
      { _id: 'r1', status: 'PENDING', expiresAt: new Date('2020-01-01T00:00:00.000Z') },
      { _id: 'r2', status: 'PENDING', expiresAt: new Date(Date.now() + 3_600_000) },
    ]);
    jest.spyOn(FoodRequest, 'find').mockReturnValue({
      sort: () => ({ lean: leanMock }),
    });

    const result = await getRequestsByRecipient('recipient1');

    expect(result.map((request) => request.status)).toEqual(['EXPIRED', 'PENDING']);
  });
});

// ---------------------------------------------------------------------------
// Task 11 (backend) — controller, service auto-mocked
// ---------------------------------------------------------------------------
describe('dushani-createFoodRequestController (Task 11 backend support)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 201 with the created request on success', async () => {
    mockedCreateService.createFoodRequest.mockResolvedValue({ id: 'req1' });
    const req = {
      body: { foodType: 'Rice', quantity: '5 kg', location: 'Colombo 05' },
      user: { id: 'user1' },
    };
    const res = mockResponse();

    await createFoodRequestHandler(req, res);

    expect(mockedCreateService.createFoodRequest).toHaveBeenCalledWith({
      recipientId: 'user1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
      details: undefined,
      contactNumber: undefined,
      urgency: undefined,
      preferredAt: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'req1' });
  });

  it('returns the service error status code on failure', async () => {
    const error = new Error('foodType, quantity and location are required');
    error.statusCode = 400;
    mockedCreateService.createFoodRequest.mockRejectedValue(error);

    const req = { body: {}, user: { id: 'user1' } };
    const res = mockResponse();

    await createFoodRequestHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });

  it('falls back to a 500 when the thrown error has no statusCode', async () => {
    mockedCreateService.createFoodRequest.mockRejectedValue(new Error('DB unavailable'));
    const req = {
      body: { foodType: 'Rice', quantity: '5 kg', location: 'Colombo 05' },
      user: { id: 'user1' },
    };
    const res = mockResponse();

    await createFoodRequestHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// Task 13 (backend) — controller, service auto-mocked
// ---------------------------------------------------------------------------
describe('dushani-requestStatusController (Task 13 backend support)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the recipient requests as JSON', async () => {
    mockedStatusService.getRequestsByRecipient.mockResolvedValue([{ id: 'r1' }]);
    const req = { user: { id: 'user1' } };
    const res = mockResponse();

    await getMyRequestsHandler(req, res);

    expect(mockedStatusService.getRequestsByRecipient).toHaveBeenCalledWith('user1');
    expect(res.json).toHaveBeenCalledWith([{ id: 'r1' }]);
  });

  it('returns 500 when the service throws', async () => {
    mockedStatusService.getRequestsByRecipient.mockRejectedValue(new Error('DB down'));
    const req = { user: { id: 'user1' } };
    const res = mockResponse();

    await getMyRequestsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// Sprint item 3 (backend) — request progress service, real implementation
// ---------------------------------------------------------------------------
const { getRequestProgress } = jest.requireActual(
  '../../src/services/dushani-requestProgressService',
);

function stubRequest(overrides) {
  return {
    _id: { toString: () => 'req1' },
    foodType: 'Cooked Rice',
    quantity: 'Cooked Rice - 6 packets',
    location: 'Galle Road, Colombo',
    details: '',
    contactNumber: '0771234567',
    urgency: 'NORMAL',
    priority: 'NORMAL',
    status: 'PENDING',
    createdAt: new Date('2026-09-23T09:00:00.000Z'),
    updatedAt: new Date('2026-09-23T10:30:00.000Z'),
    // Kept relative to the clock: this stub is the "still waiting" case, and a
    // fixed date turns the whole suite red the moment that hour passes.
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    preferredAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    ...overrides,
  };
}

function mockFound(doc) {
  return jest.spyOn(FoodRequest, 'findOne').mockResolvedValue(doc);
}

describe('getRequestProgress (sprint item 3)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports a waiting request as step 1 of 4 with no donor stage reached', async () => {
    mockFound(stubRequest({}));
    const { progress, timeline } = await getRequestProgress('recipient1', 'req1');

    expect(progress).toMatchObject({
      status: 'PENDING',
      stageLabel: 'Waiting for a donor',
      stepsCompleted: 1,
      stepsTotal: 4,
      percent: 25,
      outcome: 'active',
    });
    // Posting is already a step, so "looking for a donor" is not repeated.
    expect(timeline.map((entry) => entry.key)).toEqual([
      'POSTED',
      'MATCHED',
      'DISPATCHED',
      'FULFILLED',
    ]);
    expect(timeline.map((entry) => entry.state)).toEqual([
      'done',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(timeline[0].at).toEqual(new Date('2026-09-23T09:00:00.000Z'));
  });

  it('marks an accepted request as the current step', async () => {
    mockFound(stubRequest({ status: 'MATCHED' }));
    const { progress, timeline } = await getRequestProgress('recipient1', 'req1');

    expect(progress).toMatchObject({
      stageLabel: 'Accepted by a donor',
      percent: 50,
      stepsCompleted: 2,
      outcome: 'active',
    });
    expect(timeline.map((entry) => entry.state)).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(timeline[1].at).toEqual(new Date('2026-09-23T10:30:00.000Z'));
  });

  it('shows delivery on the way as step 3 of 4', async () => {
    mockFound(stubRequest({ status: 'DISPATCHED' }));
    const { progress, timeline } = await getRequestProgress('recipient1', 'req1');

    expect(progress).toMatchObject({
      stageLabel: 'Delivery on the way',
      percent: 75,
      stepsCompleted: 3,
      outcome: 'active',
    });
    expect(timeline.map((entry) => entry.state)).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
    ]);
    expect(timeline[2].at).toEqual(new Date('2026-09-23T10:30:00.000Z'));
  });

  it('completes at 100% when fulfilled', async () => {
    mockFound(stubRequest({ status: 'FULFILLED' }));
    const { progress, timeline } = await getRequestProgress('recipient1', 'req1');

    expect(progress).toMatchObject({ percent: 100, stepsCompleted: 4, outcome: 'complete' });
    expect(progress.expiresInMs).toBeNull();
    expect(timeline.every((entry) => entry.state === 'done')).toBe(true);
  });

  it('reports the moment each stage actually happened', async () => {
    mockFound(
      stubRequest({
        status: 'FULFILLED',
        acceptedAt: new Date('2026-09-23T09:30:00.000Z'),
        dispatchedAt: new Date('2026-09-23T11:15:00.000Z'),
        fulfilledAt: new Date('2026-09-23T12:45:00.000Z'),
      }),
    );
    const { timeline } = await getRequestProgress('recipient1', 'req1');

    expect(timeline.map((entry) => entry.at)).toEqual([
      new Date('2026-09-23T09:00:00.000Z'),
      new Date('2026-09-23T09:30:00.000Z'),
      new Date('2026-09-23T11:15:00.000Z'),
      new Date('2026-09-23T12:45:00.000Z'),
    ]);
  });

  it.each(['EXPIRED', 'CANCELLED'])('adds a stopped entry for %s', async (status) => {
    mockFound(stubRequest({ status }));
    const { progress, timeline } = await getRequestProgress('recipient1', 'req1');

    expect(progress).toMatchObject({ percent: 25, stepsCompleted: 1, outcome: 'stopped' });
    expect(timeline).toHaveLength(5);
    expect(timeline[4]).toMatchObject({ key: status, state: 'stopped' });
    expect(progress.expiresInMs).toBeNull();
  });

  it('treats a pending request past its expiry as expired', async () => {
    mockFound(stubRequest({ status: 'PENDING', expiresAt: new Date('2020-01-01T00:00:00.000Z') }));
    const { progress } = await getRequestProgress('recipient1', 'req1');

    expect(progress).toMatchObject({ status: 'EXPIRED', outcome: 'stopped' });
  });

  it('scopes the lookup to the owning recipient and 404s otherwise', async () => {
    const spy = mockFound(null);
    await expect(getRequestProgress('recipient1', 'other')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(spy).toHaveBeenCalledWith({ _id: 'other', recipient: 'recipient1' });
  });

  it('rejects a missing recipient with 400', async () => {
    await expect(getRequestProgress(null, 'req1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

// ---------------------------------------------------------------------------
// Sprint item 3 (backend) — request deletion, real implementation
// ---------------------------------------------------------------------------
describe('deleteFoodRequest (sprint item 3)', () => {
  afterEach(() => jest.restoreAllMocks());

  function mockDeletable(overrides) {
    const doc = stubRequest(overrides);
    doc.deleteOne = jest.fn().mockResolvedValue(doc);
    mockFound(doc);
    return doc;
  }

  it.each(['PENDING', 'EXPIRED', 'CANCELLED'])(
    'deletes a %s request that no donor claimed',
    async (status) => {
      const doc = mockDeletable({ status });
      await expect(deleteFoodRequest('recipient1', 'req1')).resolves.toEqual({
        id: 'req1',
        status,
      });
      expect(doc.deleteOne).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['MATCHED', 'DISPATCHED', 'FULFILLED'])(
    'refuses to delete a %s request with 409',
    async (status) => {
      const doc = mockDeletable({ status });
      await expect(deleteFoodRequest('recipient1', 'req1')).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(doc.deleteOne).not.toHaveBeenCalled();
    },
  );

  it('scopes the lookup to the owning recipient', async () => {
    const spy = mockFound(null);
    await expect(deleteFoodRequest('recipient1', 'req1')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(spy).toHaveBeenCalledWith({ _id: 'req1', recipient: 'recipient1' });
  });

  it('rejects a call without both ids with 400', async () => {
    await expect(deleteFoodRequest(null, 'req1')).rejects.toMatchObject({ statusCode: 400 });
    await expect(deleteFoodRequest('recipient1', null)).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ---------------------------------------------------------------------------
// Sprint item 3 (backend) — delete controller, service auto-mocked
// ---------------------------------------------------------------------------
describe('dushani-deleteFoodRequestController (sprint item 3)', () => {  beforeEach(() => jest.clearAllMocks());

  it('reports success with the deleted id', async () => {
    mockedDeleteService.deleteFoodRequest.mockResolvedValue({ id: 'req1', status: 'PENDING' });
    const req = { params: { id: 'req1' }, user: { id: 'user1' } };
    const res = mockResponse();

    await deleteFoodRequestHandler(req, res);

    expect(mockedDeleteService.deleteFoodRequest).toHaveBeenCalledWith('user1', 'req1');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, id: 'req1', status: 'PENDING' });
  });

  it('maps the 409 from a donor-committed request', async () => {
    mockedDeleteService.deleteFoodRequest.mockRejectedValue(
      Object.assign(new Error('A donor has already accepted this request'), { statusCode: 409 }),
    );
    const req = { params: { id: 'req1' }, user: { id: 'user1' } };
    const res = mockResponse();

    await deleteFoodRequestHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

// ---------------------------------------------------------------------------
// Sprint item 4 (backend) — open request board and donor accept
// ---------------------------------------------------------------------------
const {
  getOpenRequests,
  acceptFoodRequest,
} = require('../../src/services/dushani-requestBoardService');

function doc(overrides) {
  return stubRequest(overrides);
}

describe('getOpenRequests (sprint item 4)', () => {
  afterEach(() => jest.restoreAllMocks());

  function mockFindAll(docs) {
    const lean = jest.fn().mockResolvedValue(docs);
    const select = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ select });
    const find = jest.spyOn(FoodRequest, 'find').mockReturnValue({ sort });
    return { find, sort, select, lean };
  }

  it('lists only live pending requests', async () => {
    const spies = mockFindAll([]);
    await getOpenRequests();

    const query = spies.find.mock.calls[0][0];
    expect(query.status).toBe('PENDING');
    expect(query.expiresAt.$gt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(spies.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('puts emergency requests first and hides contact details', async () => {
    mockFindAll([
      doc({ _id: { toString: () => 'normal1' }, urgency: 'NORMAL' }),
      doc({ _id: { toString: () => 'urgent1' }, urgency: 'URGENT' }),
    ]);

    const result = await getOpenRequests();

    expect(result.map((request) => request.id)).toEqual(['urgent1', 'normal1']);
    expect(Object.keys(result[0]).sort()).toEqual(
      ['createdAt', 'expiresAt', 'foodType', 'id', 'location', 'preferredAt', 'priority', 'quantity', 'status', 'urgency'].sort(),
    );
  });
});

describe('acceptFoodRequest (sprint item 4)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lets a donor claim a waiting request and reveals the phone number', async () => {
    const write = jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'MATCHED' }));

    const result = await acceptFoodRequest({
      donorId: 'donor1',
      role: 'DONOR',
      requestId: 'req1',
    });

    const [query, update] = write.mock.calls[0];
    expect(query.status).toBe('PENDING');
    expect(update.$set).toMatchObject({ status: 'MATCHED', acceptedBy: 'donor1' });
    expect(result).toMatchObject({ id: 'req1', status: 'MATCHED', contactNumber: '0771234567' });
  });

  it.each(['RECIPIENT', 'NGO', 'VOLUNTEER'])('refuses a %s with 403', async (role) => {
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate');
    await expect(
      acceptFoodRequest({ donorId: 'someone', role, requestId: 'req1' }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(write).not.toHaveBeenCalled();
  });

  it('409s a request another donor already took', async () => {
    jest.spyOn(FoodRequest, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(FoodRequest, 'findById').mockResolvedValue(doc({ status: 'MATCHED' }));

    await expect(
      acceptFoodRequest({ donorId: 'donor1', role: 'DONOR', requestId: 'req1' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('409s an expired request', async () => {
    jest.spyOn(FoodRequest, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(FoodRequest, 'findById').mockResolvedValue(
      doc({ status: 'PENDING', expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
    );

    await expect(
      acceptFoodRequest({ donorId: 'donor1', role: 'DONOR', requestId: 'req1' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('404s a request that does not exist', async () => {
    jest.spyOn(FoodRequest, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(FoodRequest, 'findById').mockResolvedValue(null);

    await expect(
      acceptFoodRequest({ donorId: 'donor1', role: 'DONOR', requestId: 'req1' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('400s without a donor or request id', async () => {
    await expect(
      acceptFoodRequest({ donorId: null, role: 'DONOR', requestId: 'req1' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      acceptFoodRequest({ donorId: 'donor1', role: 'DONOR', requestId: null }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ---------------------------------------------------------------------------
// Sprint item 4 (backend) — when the recipient wants the food
// ---------------------------------------------------------------------------
describe('createFoodRequest preferredAt (sprint item 4)', () => {
  afterEach(() => jest.restoreAllMocks());

  const base = {
    recipientId: 'recipient1',
    foodType: 'Rice',
    quantity: '5 kg',
    location: 'Colombo 05',
    contactNumber: '0771234567',
  };

  it('needs a preferred time for a standard request', async () => {
    const createSpy = jest.spyOn(FoodRequest, 'create');

    await expect(createFoodRequest(base)).rejects.toMatchObject({
      statusCode: 400,
      message: 'preferredAt is required — choose when you need the food',
    });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejects a time that has already passed', async () => {
    jest.spyOn(FoodRequest, 'create');

    await expect(
      createFoodRequest({ ...base, preferredAt: new Date(Date.now() - 60_000) }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Choose a time in the future' });
  });

  it('rejects a time inside the five hour emergency window', async () => {
    jest.spyOn(FoodRequest, 'create');

    await expect(
      createFoodRequest({ ...base, preferredAt: new Date(Date.now() + 2 * 3_600_000) }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'A standard request is for food needed at least 5 hours ahead — post an emergency request for anything sooner',
    });
  });

  it('rejects a time more than two days ahead', async () => {
    jest.spyOn(FoodRequest, 'create');

    await expect(
      createFoodRequest({
        ...base,
        preferredAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'You can only ask for food within the next two days',
    });
  });

  it('lets an emergency request through without a time — it is needed now', async () => {
    const createSpy = jest
      .spyOn(FoodRequest, 'create')
      .mockResolvedValue({ id: 'req1' });

    await createFoodRequest({ ...base, urgency: 'URGENT' });

    const written = createSpy.mock.calls[0][0];
    expect(written.urgency).toBe('URGENT');
    expect(written.preferredAt).toBeUndefined();
    expect(written.expiresAt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Sprint item 4 (backend) — pushing a claimed request through the stages
// ---------------------------------------------------------------------------
const { updateFoodRequestStatus } = require('../../src/services/dushani-updateRequestStatusService');

describe('updateFoodRequestStatus (sprint item 4)', () => {
  afterEach(() => jest.restoreAllMocks());

  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

  it('stamps each stage on the model as null until it happens', () => {
    const pending = new FoodRequest({
      recipient: 'recipient1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
    });
    expect(pending.dispatchedAt).toBeNull();
    expect(pending.fulfilledAt).toBeNull();
  });

  it('lets the claiming donor put the delivery on the way', async () => {
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValue(doc({ status: 'MATCHED', acceptedBy: 'donor1', expiresAt: future }));
    const write = jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'DISPATCHED', acceptedBy: 'donor1' }));

    const result = await updateFoodRequestStatus({
      actorId: 'donor1',
      role: 'DONOR',
      requestId: 'req1',
      status: 'DISPATCHED',
    });

    const [query, update] = write.mock.calls[0];
    expect(query).toMatchObject({ _id: 'req1', status: { $in: ['MATCHED'] } });
    expect(update.$set.status).toBe('DISPATCHED');
    expect(update.$set.dispatchedAt).toBeInstanceOf(Date);
    expect(result).toMatchObject({ id: 'req1', status: 'DISPATCHED', stageLabel: 'on the way' });
  });

  it('lets a volunteer dispatch and deliver without claiming the request', async () => {
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValue(doc({ status: 'MATCHED', acceptedBy: 'donor1', expiresAt: future }));
    const write = jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'FULFILLED', acceptedBy: 'donor1' }));

    const result = await updateFoodRequestStatus({
      actorId: 'volunteer1',
      role: 'VOLUNTEER',
      requestId: 'req1',
      status: 'FULFILLED',
    });

    expect(write).toHaveBeenCalled();
    expect(result.status).toBe('FULFILLED');
  });

  it('lets the recipient confirm the food arrived', async () => {
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValue(doc({ status: 'DISPATCHED', recipient: 'recipient1', expiresAt: future }));
    const write = jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'FULFILLED', recipient: 'recipient1' }));

    await updateFoodRequestStatus({
      actorId: 'recipient1',
      role: 'RECIPIENT',
      requestId: 'req1',
      status: 'FULFILLED',
    });

    const [, update] = write.mock.calls[0];
    expect(update.$set.fulfilledAt).toBeInstanceOf(Date);
  });

  it('refuses a donor who never claimed the request', async () => {
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValue(doc({ status: 'MATCHED', acceptedBy: 'donor1', expiresAt: future }));
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate');

    await expect(
      updateFoodRequestStatus({
        actorId: 'other-donor',
        role: 'DONOR',
        requestId: 'req1',
        status: 'DISPATCHED',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(write).not.toHaveBeenCalled();
  });

  it('refuses a recipient who tries to move the delivery themselves', async () => {
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValue(doc({ status: 'MATCHED', acceptedBy: 'donor1', expiresAt: future }));

    await expect(
      updateFoodRequestStatus({
        actorId: 'recipient1',
        role: 'RECIPIENT',
        requestId: 'req1',
        status: 'DISPATCHED',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuses an NGO', async () => {
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValue(doc({ status: 'MATCHED', acceptedBy: 'donor1', expiresAt: future }));

    await expect(
      updateFoodRequestStatus({
        actorId: 'ngo1',
        role: 'NGO',
        requestId: 'req1',
        status: 'DISPATCHED',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('only accepts the two stages this endpoint owns', async () => {
    await expect(
      updateFoodRequestStatus({
        actorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        status: 'MATCHED',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      updateFoodRequestStatus({
        actorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        status: 'EXPIRED',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('never moves forward from a waiting request', async () => {
    const waiting = doc({ status: 'PENDING', acceptedBy: null, expiresAt: future });
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValueOnce(waiting)
      .mockResolvedValueOnce(waiting);
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate').mockResolvedValue(null);

    await expect(
      updateFoodRequestStatus({
        actorId: 'volunteer1',
        role: 'VOLUNTEER',
        requestId: 'req1',
        status: 'DISPATCHED',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'This request has moved on — refresh to see its latest status',
    });
    // The status filter is what stops the write, not a read-then-save.
    expect(write.mock.calls[0][0].status.$in).toEqual(['MATCHED']);
  });

  it('says so when the stage was already reached', async () => {
    jest
      .spyOn(FoodRequest, 'findById')
      .mockResolvedValueOnce(doc({ status: 'MATCHED', acceptedBy: 'donor1', expiresAt: future }))
      .mockResolvedValueOnce(doc({ status: 'FULFILLED', acceptedBy: 'donor1' }));
    jest.spyOn(FoodRequest, 'findOneAndUpdate').mockResolvedValue(null);

    await expect(
      updateFoodRequestStatus({
        actorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        status: 'FULFILLED',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'This request is already marked as delivered',
    });
  });

  it('409s an expired request', async () => {
    jest.spyOn(FoodRequest, 'findById').mockResolvedValue(
      doc({
        status: 'PENDING',
        acceptedBy: 'donor1',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    );
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate');

    await expect(
      updateFoodRequestStatus({
        actorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        status: 'DISPATCHED',
      }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'This request has expired' });
    expect(write).not.toHaveBeenCalled();
  });

  it('404s a request that does not exist', async () => {
    jest.spyOn(FoodRequest, 'findById').mockResolvedValue(null);

    await expect(
      updateFoodRequestStatus({
        actorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        status: 'DISPATCHED',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('400s without an actor or request id', async () => {
    await expect(
      updateFoodRequestStatus({ actorId: null, role: 'DONOR', requestId: 'req1', status: 'DISPATCHED' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      updateFoodRequestStatus({ actorId: 'donor1', role: 'DONOR', requestId: null, status: 'DISPATCHED' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ---------------------------------------------------------------------------
// Sprint item 09 (backend) — cancelling a request, real implementation
// ---------------------------------------------------------------------------
describe('cancelFoodRequest (sprint item 09)', () => {
  afterEach(() => jest.restoreAllMocks());

  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

  it('stamps cancelledAt on the model as null until the request is called off', () => {
    const pending = new FoodRequest({
      recipient: 'recipient1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
    });
    expect(pending.cancelledAt).toBeNull();
  });

  it.each(['PENDING', 'MATCHED', 'DISPATCHED'])(
    'cancels a live %s request and stamps the moment',
    async (status) => {
      mockFound(doc({ status, expiresAt: future }));
      const write = jest
        .spyOn(FoodRequest, 'findOneAndUpdate')
        .mockResolvedValue(doc({ status: 'CANCELLED', expiresAt: future }));

      await expect(cancelFoodRequest('recipient1', 'req1')).resolves.toMatchObject({
        id: 'req1',
        status: 'CANCELLED',
      });

      const [query, update] = write.mock.calls[0];
      expect(query).toMatchObject({
        _id: 'req1',
        recipient: 'recipient1',
        status: { $in: ['PENDING', 'MATCHED', 'DISPATCHED'] },
      });
      expect(update.$set.status).toBe('CANCELLED');
      expect(update.$set.cancelledAt).toBeInstanceOf(Date);
    },
  );

  it('keeps the donor who had claimed the request visible', async () => {
    const found = doc({ status: 'MATCHED', acceptedBy: 'donor1', expiresAt: future });
    mockFound(found);
    jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'CANCELLED', acceptedBy: 'donor1', expiresAt: future }));

    await cancelFoodRequest('recipient1', 'req1');

    // Releasing the donation itself is the next sprint item, so the claim is
    // left on the document for it to read.
    const [, update] = FoodRequest.findOneAndUpdate.mock.calls[0];
    expect(update.$set).not.toHaveProperty('acceptedBy');
    expect(found.acceptedBy).toBe('donor1');
  });

  it('scopes the lookup to the owning recipient', async () => {
    const spy = mockFound(null);
    await expect(cancelFoodRequest('recipient1', 'req1')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(spy).toHaveBeenCalledWith({ _id: 'req1', recipient: 'recipient1' });
  });

  it('409s a request that is already cancelled', async () => {
    mockFound(doc({ status: 'CANCELLED', expiresAt: future }));
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate');

    await expect(cancelFoodRequest('recipient1', 'req1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'This request is already cancelled',
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('409s a request the food was already delivered for', async () => {
    mockFound(doc({ status: 'FULFILLED', expiresAt: future }));

    await expect(cancelFoodRequest('recipient1', 'req1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'The food has already been delivered — there is nothing to cancel',
    });
  });

  it('409s a waiting request whose expiry has passed', async () => {
    mockFound(
      doc({ status: 'PENDING', expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
    );
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate');

    await expect(cancelFoodRequest('recipient1', 'req1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'This request has already expired',
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('409s when a donor claimed the request in the same moment', async () => {
    mockFound(doc({ status: 'PENDING', expiresAt: future }));
    jest.spyOn(FoodRequest, 'findOneAndUpdate').mockResolvedValue(null);

    await expect(cancelFoodRequest('recipient1', 'req1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'This request has moved on — refresh to see its latest status',
    });
  });

  it('400s without a recipient or request id', async () => {
    await expect(cancelFoodRequest(null, 'req1')).rejects.toMatchObject({ statusCode: 400 });
    await expect(cancelFoodRequest('recipient1', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('puts the cancelled moment on the progress timeline', async () => {
    const cancelledAt = new Date('2026-09-24T08:15:00.000Z');
    mockFound(
      doc({
        status: 'CANCELLED',
        cancelledAt,
        updatedAt: new Date('2026-09-24T09:40:00.000Z'),
        expiresAt: future,
      }),
    );

    const { progress, timeline } = await getRequestProgress('recipient1', 'req1');

    expect(progress).toMatchObject({ outcome: 'stopped', stageLabel: 'Request cancelled' });
    const last = timeline[timeline.length - 1];
    expect(last).toMatchObject({ key: 'CANCELLED', state: 'stopped' });
    expect(last.at).toEqual(cancelledAt);
  });
});

// ---------------------------------------------------------------------------
// Sprint item 09 (backend) — cancel controller, service auto-mocked
// ---------------------------------------------------------------------------
describe('dushani-cancelFoodRequestController (sprint item 09)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports success with the cancelled id', async () => {
    mockedCancelService.cancelFoodRequest.mockResolvedValue({
      id: 'req1',
      status: 'CANCELLED',
    });
    const req = { params: { id: 'req1' }, user: { id: 'user1' } };
    const res = mockResponse();

    await cancelFoodRequestHandler(req, res);

    expect(mockedCancelService.cancelFoodRequest).toHaveBeenCalledWith('user1', 'req1');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      id: 'req1',
      status: 'CANCELLED',
    });
  });

  it('maps the 404 for a request the caller does not own', async () => {
    mockedCancelService.cancelFoodRequest.mockRejectedValue(
      Object.assign(new Error('Food request not found'), { statusCode: 404 }),
    );
    const req = { params: { id: 'req1' }, user: { id: 'user1' } };
    const res = mockResponse();

    await cancelFoodRequestHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Food request not found' });
  });

  it('sends an unexpected failure as 500', async () => {
    mockedCancelService.cancelFoodRequest.mockRejectedValue(new Error('mongo is down'));
    const req = { params: { id: 'req1' }, user: { id: 'user1' } };
    const res = mockResponse();

    await cancelFoodRequestHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// Sprint item 10 (backend) — the donation a claim holds, and its release
// ---------------------------------------------------------------------------
const Donation = require('../../src/models/kaveesha-Donation');
const { heldDonationIds } = require('../../src/services/dushani-donationHoldService');
const { loadCandidates } = require('../../src/services/dushani-matchRequestService');

// Mongoose queries here are all terminal-`.lean()` chains, so one self-returning
// step covers find/sort/limit/select whatever the service happens to call.
function chainQuery(docs) {
  const step = {};
  ['sort', 'limit', 'select'].forEach((method) => {
    step[method] = jest.fn(() => step);
  });
  step.lean = jest.fn(() => Promise.resolve(docs));
  return step;
}

const poolExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000);
// Real ObjectId values: the services validate the id before they query, so a
// made-up string would be rejected as malformed rather than tested.
const DON_ID = new mongoose.Types.ObjectId();
const DON2_ID = new mongoose.Types.ObjectId();

function donorDonation(overrides) {
  return {
    _id: DON_ID,
    donor: 'donor1',
    foodType: 'Cooked Rice',
    numberOfPortions: 40,
    quantity: 10,
    status: 'active',
    expiryTime: poolExpiry,
    ...overrides,
  };
}

// The hold lookup runs on every accept; the default is an empty pool of holders.
function mockHolders(rows = []) {
  return jest
    .spyOn(FoodRequest, 'find')
    .mockImplementation((query) =>
      chainQuery(query && query.status ? rows : [])
    );
}

describe('acceptFoodRequest with a donation (sprint item 10)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('records which of the donor’s own donations will deliver the request', async () => {
    mockHolders();
    jest
      .spyOn(Donation, 'findOne')
      .mockReturnValue(chainQuery(donorDonation()));
    const write = jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'MATCHED' }));

    const result = await acceptFoodRequest({
      donorId: 'donor1',
      role: 'DONOR',
      requestId: 'req1',
      donationId: `${DON_ID}`,
    });

    const [query, update] = write.mock.calls[0];
    expect(query).toMatchObject({ _id: 'req1', status: 'PENDING' });
    expect(update.$set.linkedDonation).toBe(`${DON_ID}`);
    expect(result.linkedDonation).toEqual({
      id: `${DON_ID}`,
      foodType: 'Cooked Rice',
      numberOfPortions: 40,
    });
  });

  it('still claims without naming a donation', async () => {
    const findOne = jest.spyOn(Donation, 'findOne');
    mockHolders();
    const write = jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'MATCHED' }));

    const result = await acceptFoodRequest({
      donorId: 'donor1',
      role: 'DONOR',
      requestId: 'req1',
    });

    expect(findOne).not.toHaveBeenCalled();
    expect(write.mock.calls[0][1].$set.linkedDonation).toBeNull();
    expect(result.linkedDonation).toBeNull();
  });

  it('400s a donation that is not the donor’s own', async () => {
    mockHolders();
    jest.spyOn(Donation, 'findOne').mockReturnValue(chainQuery(null));
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate');

    await expect(
      acceptFoodRequest({
        donorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        donationId: `${DON_ID}`,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Pick one of your own live donations to deliver this request',
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('400s an id that is not a donation at all', async () => {
    const findOne = jest.spyOn(Donation, 'findOne');
    await expect(
      acceptFoodRequest({
        donorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        donationId: 'not-an-id',
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'That donation does not look right' });
    expect(findOne).not.toHaveBeenCalled();
  });

  it('409s a donation that has already gone', async () => {
    mockHolders();
    jest
      .spyOn(Donation, 'findOne')
      .mockReturnValue(chainQuery(donorDonation({ status: 'completed' })));

    await expect(
      acceptFoodRequest({
        donorId: 'donor1',
        role: 'DONOR',
        requestId: 'req1',
        donationId: `${DON_ID}`,
      }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'That donation is no longer available' });
  });

  it('409s a donation another request is already holding', async () => {
    mockHolders([{ linkedDonation: DON_ID }]);
    jest.spyOn(Donation, 'findOne').mockReturnValue(chainQuery(donorDonation()));
    const write = jest.spyOn(FoodRequest, 'findOneAndUpdate');

    await expect(
      acceptFoodRequest({
        donorId: 'donor1',
        role: 'DONOR',
        requestId: 'req2',
        donationId: `${DON_ID}`,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'That donation is already committed to another request',
    });
    expect(write).not.toHaveBeenCalled();
  });
});

describe('the donation pool around a held donation (sprint item 10)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('holds every donation committed to a live request', async () => {
    const find = jest
      .spyOn(FoodRequest, 'find')
      .mockReturnValue(chainQuery([{ linkedDonation: DON_ID }]));

    const held = await heldDonationIds();

    const query = find.mock.calls[0][0];
    expect(query.status.$in).toEqual(['MATCHED', 'DISPATCHED', 'FULFILLED']);
    expect(query.linkedDonation).toEqual({ $ne: null });
    expect(held.has(`${DON_ID}`)).toBe(true);
  });

  it('takes the committed donation out of the pool other recipients search', async () => {
    mockHolders([{ linkedDonation: DON_ID }]);
    jest
      .spyOn(Donation, 'find')
      .mockReturnValue(chainQuery([donorDonation(), donorDonation({ _id: DON2_ID })]));

    const pool = await loadCandidates(Date.now());

    expect(pool.map((donation) => `${donation._id}`)).toEqual([`${DON2_ID}`]);
  });

  it('lists it again once nothing holds it', async () => {
    mockHolders([]);
    jest
      .spyOn(Donation, 'find')
      .mockReturnValue(chainQuery([donorDonation(), donorDonation({ _id: DON2_ID })]));

    const pool = await loadCandidates(Date.now());

    expect(pool.map((donation) => `${donation._id}`)).toEqual([`${DON_ID}`, `${DON2_ID}`]);
  });
});

describe('cancelFoodRequest releases the donation (sprint item 10)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports the donation that went back to the pool', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockFound(
      doc({ status: 'MATCHED', acceptedBy: 'donor1', linkedDonation: DON_ID, expiresAt: future }),
    );
    jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(
        doc({ status: 'CANCELLED', acceptedBy: 'donor1', linkedDonation: DON_ID, expiresAt: future }),
      );
    jest
      .spyOn(Donation, 'findById')
      .mockReturnValue(chainQuery(donorDonation()));

    const result = await cancelFoodRequest('recipient1', 'req1');

    expect(result).toMatchObject({ id: 'req1', status: 'CANCELLED' });
    expect(result.releasedDonation).toEqual({
      id: `${DON_ID}`,
      foodType: 'Cooked Rice',
      numberOfPortions: 40,
    });
  });

  it('releases nothing when the donor never named a donation', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockFound(doc({ status: 'PENDING', expiresAt: future }));
    jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'CANCELLED', expiresAt: future }));
    const findById = jest.spyOn(Donation, 'findById');

    const result = await cancelFoodRequest('recipient1', 'req1');

    expect(findById).not.toHaveBeenCalled();
    expect(result.releasedDonation).toBeNull();
  });

  it('keeps the link on the cancelled request as the record of what was released', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockFound(doc({ status: 'MATCHED', linkedDonation: DON_ID, expiresAt: future }));
    const write = jest
      .spyOn(FoodRequest, 'findOneAndUpdate')
      .mockResolvedValue(doc({ status: 'CANCELLED', linkedDonation: DON_ID, expiresAt: future }));
    jest.spyOn(Donation, 'findById').mockReturnValue(chainQuery(donorDonation()));

    await cancelFoodRequest('recipient1', 'req1');

    // The pool exclusion is read from the request's status, so CANCELLED alone
    // frees the donation — the link itself stays for the history screens.
    expect(write.mock.calls[0][1].$set).not.toHaveProperty('linkedDonation');
  });
});

// ---------------------------------------------------------------------------
// Sprint item 12 — Historical Request Retrieval
// ---------------------------------------------------------------------------
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const posted = new Date('2026-09-10T08:00:00.000Z');

function historyDoc(overrides) {
  return {
    _id: new mongoose.Types.ObjectId(),
    recipient: 'recipient1',
    foodType: 'Cooked Rice',
    quantity: '10 packets',
    location: 'Colombo 05',
    urgency: 'NORMAL',
    status: 'FULFILLED',
    createdAt: posted,
    updatedAt: new Date(posted.getTime() + HOUR),
    // Still open by default, so a PENDING fixture is not silently read as
    // expired just because the posting date sits in the past.
    expiresAt: new Date(Date.now() + 24 * HOUR),
    acceptedAt: null,
    dispatchedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

function mockHistoryFind(rows) {
  const find = jest.spyOn(FoodRequest, 'find').mockReturnValue(chainQuery(rows));
  return find;
}

describe('getRequestHistory (sprint item 12)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reads only the caller’s own requests', async () => {
    const find = mockHistoryFind([]);

    await getRequestHistory('recipient1');

    expect(find.mock.calls[0][0]).toEqual({ recipient: 'recipient1' });
  });

  it('keeps just the requests that can no longer be answered', async () => {
    mockHistoryFind([
      historyDoc({ _id: 'live1', status: 'PENDING' }),
      historyDoc({ _id: 'live2', status: 'DISPATCHED' }),
      historyDoc({ _id: 'got', status: 'FULFILLED', fulfilledAt: new Date(Date.now() - 30 * DAY) }),
      historyDoc({ _id: 'off', status: 'CANCELLED', cancelledAt: new Date(Date.now() - 5 * DAY) }),
      historyDoc({ _id: 'missed', status: 'PENDING', expiresAt: new Date(Date.now() - DAY) }),
    ]);

    const rows = await getRequestHistory('recipient1');

    // Newest closure first, and the dead PENDING row joins it as EXPIRED.
    expect(rows.map((row) => row._id)).toEqual(['missed', 'off', 'got']);
    expect(rows.map((row) => row.status)).toEqual(['EXPIRED', 'CANCELLED', 'FULFILLED']);
  });

  it('says when each outcome actually ended', async () => {
    const fulfilledAt = new Date('2026-09-12T15:00:00.000Z');
    const cancelledAt = new Date('2026-09-12T09:00:00.000Z');
    const expiredAt = new Date('2026-09-12T12:00:00.000Z');
    mockHistoryFind([
      historyDoc({ _id: 'got', status: 'FULFILLED', fulfilledAt }),
      historyDoc({ _id: 'off', status: 'CANCELLED', cancelledAt }),
      historyDoc({ _id: 'missed', status: 'EXPIRED', expiresAt: expiredAt }),
    ]);

    const rows = await getRequestHistory('recipient1');

    const closedAt = Object.fromEntries(
      rows.map((row) => [row._id, new Date(row.closedAt).getTime()]),
    );
    expect(closedAt).toEqual({
      got: fulfilledAt.getTime(),
      off: cancelledAt.getTime(),
      missed: expiredAt.getTime(),
    });
  });

  it('falls back to the last write for a request that closed before stages stamped', async () => {
    const written = new Date('2026-09-11T10:00:00.000Z');
    mockHistoryFind([historyDoc({ _id: 'old', status: 'FULFILLED', fulfilledAt: null, updatedAt: written })]);

    const rows = await getRequestHistory('recipient1');

    expect(`${rows[0].closedAt}`).toBe(`${written}`);
  });

  it('lists the most recently closed first, not the most recently posted', async () => {
    mockHistoryFind([
      historyDoc({ _id: 'posted-later', createdAt: new Date('2026-09-20T08:00:00.000Z'), cancelledAt: new Date('2026-09-20T09:00:00.000Z'), status: 'CANCELLED' }),
      historyDoc({ _id: 'posted-earlier', createdAt: posted, fulfilledAt: new Date('2026-09-28T09:00:00.000Z') }),
    ]);

    const rows = await getRequestHistory('recipient1');

    expect(rows.map((row) => row._id)).toEqual(['posted-earlier', 'posted-later']);
  });

  it('returns an empty history instead of failing', async () => {
    mockHistoryFind([historyDoc({ _id: 'live', status: 'PENDING' })]);

    await expect(getRequestHistory('recipient1')).resolves.toEqual([]);
  });

  it('refuses to read the whole collection without a recipient', async () => {
    const find = mockHistoryFind([]);

    await expect(getRequestHistory()).rejects.toMatchObject({ statusCode: 400 });
    expect(find).not.toHaveBeenCalled();
  });
});

describe('dushani-requestHistoryController (sprint item 12)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes the logged-in recipient to the lookup and lists what it found', async () => {
    const rows = [{ _id: 'req1', status: 'CANCELLED', closedAt: new Date() }];
    mockedHistoryService.getRequestHistory.mockResolvedValue(rows);
    const res = mockResponse();

    await getMyRequestHistoryHandler({ user: { id: 'recipient1', role: 'RECIPIENT' } }, res);

    expect(mockedHistoryService.getRequestHistory).toHaveBeenCalledWith('recipient1');
    expect(res.json).toHaveBeenCalledWith(rows);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('answers an anonymous call with a missing id instead of a crash', async () => {
    mockedHistoryService.getRequestHistory.mockRejectedValue(
      Object.assign(new Error('recipientId is required'), { statusCode: 400 }),
    );
    const res = mockResponse();

    await getMyRequestHistoryHandler({}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'recipientId is required' }),
    );
  });

  it('reports a failed lookup with the server message', async () => {
    mockedHistoryService.getRequestHistory.mockRejectedValue(new Error('mongo is down'));
    const res = mockResponse();

    await getMyRequestHistoryHandler({ user: { id: 'recipient1' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'mongo is down' }),
    );
  });
});

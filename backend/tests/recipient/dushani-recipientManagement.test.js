const mongoose = require('mongoose');

/**
 *
 * Only the three SERVICE modules are auto-mocked here — and only because the
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

const FoodRequest = require('../../src/models/dushani-foodRequestModel');

// Auto-mocked versions — this is what the controllers under test actually call.
const mockedCreateService = require('../../src/services/dushani-createFoodRequestService');
const mockedStatusService = require('../../src/services/dushani-requestStatusService');
const mockedDeleteService = require('../../src/services/dushani-deleteFoodRequestService');

// Real, unmocked implementations — used to test the service layer itself.
const { createFoodRequest } = jest.requireActual('../../src/services/dushani-createFoodRequestService');
const { getRequestsByRecipient } = jest.requireActual('../../src/services/dushani-requestStatusService');
const { deleteFoodRequest } = jest.requireActual('../../src/services/dushani-deleteFoodRequestService');

const { createFoodRequestHandler } = require('../../src/controllers/dushani-createFoodRequestController');
const { getMyRequestsHandler } = require('../../src/controllers/dushani-requestStatusController');
const { deleteFoodRequestHandler } = require('../../src/controllers/dushani-deleteFoodRequestController');

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
    const preferredAt = new Date(Date.now() + 3_600_000);

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
        preferredAt: new Date(Date.now() + 3_600_000),
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
    expiresAt: new Date('2026-09-24T09:00:00.000Z'),
    preferredAt: new Date('2026-09-24T09:00:00.000Z'),
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

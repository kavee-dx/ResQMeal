const mongoose = require('mongoose');

/**
 *
 * Only the two SERVICE modules are auto-mocked here — and only because the
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

const FoodRequest = require('../../src/models/dushani-foodRequestModel');

// Auto-mocked versions — this is what the controllers under test actually call.
const mockedCreateService = require('../../src/services/dushani-createFoodRequestService');
const mockedStatusService = require('../../src/services/dushani-requestStatusService');

// Real, unmocked implementations — used to test the service layer itself.
const { createFoodRequest } = jest.requireActual('../../src/services/dushani-createFoodRequestService');
const { getRequestsByRecipient } = jest.requireActual('../../src/services/dushani-requestStatusService');

const { createFoodRequestHandler } = require('../../src/controllers/dushani-createFoodRequestController');
const { getMyRequestsHandler } = require('../../src/controllers/dushani-requestStatusController');

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

    const result = await createFoodRequest({
      recipientId: 'recipient1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
      details: '',
      urgency: 'NORMAL',
    });

    expect(createSpy).toHaveBeenCalledWith({
      recipient: 'recipient1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
      details: '',
      urgency: 'NORMAL',
    });
    expect(result).toEqual({ id: 'req1' });
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
    const sortMock = jest.fn().mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
    jest.spyOn(FoodRequest, 'find').mockReturnValue({ sort: sortMock });

    const result = await getRequestsByRecipient('recipient1');

    expect(FoodRequest.find).toHaveBeenCalledWith({ recipient: 'recipient1' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toEqual([{ id: 'r1' }, { id: 'r2' }]);
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
      user: { _id: 'user1' },
    };
    const res = mockResponse();

    await createFoodRequestHandler(req, res);

    expect(mockedCreateService.createFoodRequest).toHaveBeenCalledWith({
      recipientId: 'user1',
      foodType: 'Rice',
      quantity: '5 kg',
      location: 'Colombo 05',
      details: undefined,
      urgency: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'req1' });
  });

  it('returns the service error status code on failure', async () => {
    const error = new Error('foodType, quantity and location are required');
    error.statusCode = 400;
    mockedCreateService.createFoodRequest.mockRejectedValue(error);

    const req = { body: {}, user: { _id: 'user1' } };
    const res = mockResponse();

    await createFoodRequestHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });

  it('falls back to a 500 when the thrown error has no statusCode', async () => {
    mockedCreateService.createFoodRequest.mockRejectedValue(new Error('DB unavailable'));
    const req = {
      body: { foodType: 'Rice', quantity: '5 kg', location: 'Colombo 05' },
      user: { _id: 'user1' },
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
    const req = { user: { _id: 'user1' } };
    const res = mockResponse();

    await getMyRequestsHandler(req, res);

    expect(mockedStatusService.getRequestsByRecipient).toHaveBeenCalledWith('user1');
    expect(res.json).toHaveBeenCalledWith([{ id: 'r1' }]);
  });

  it('returns 500 when the service throws', async () => {
    mockedStatusService.getRequestsByRecipient.mockRejectedValue(new Error('DB down'));
    const req = { user: { _id: 'user1' } };
    const res = mockResponse();

    await getMyRequestsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

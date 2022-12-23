const { mongoConnect, mongoDisconnect } = require("../../services/mongo");
const axios = require("axios");
const nock = require("nock");
const launchesDatabase = require("../../models/launches.mongo");
const {
  loadLaunchData,
  existsLaunchWithId,
  getAllLaunches,
  scheduleNewLaunch,
  abortLaunchById,
} = require("../../models/launches.model");
const {
  httpAddNewLaunch,
  httpAbortLaunch,
} = require("../../routes/launches/launches.controller");
const { mockRequest, mockResponse } = require("../../utils/interceptor");

describe("Launches Controller Testing", () => {
  beforeAll(async () => {
    await mongoConnect();
    //jest.mock("axios");
  });

  beforeEach(async () => {
    await launchesDatabase.deleteMany();
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });
  afterAll(async () => {
    await launchesDatabase.deleteMany();
    await mongoDisconnect();
  });
  test("should 404 and return correct value", async () => {
    const error = "Missing required launch property";
    let req = mockRequest();
    const res = mockResponse();
    await httpAddNewLaunch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error });
  });
  test.skip("should 200 and return correct value", async () => {
    let req = mockRequest();
    const res = mockResponse();
    req.body = {
      mission: "USS Enterprise",
      rocket: "NCC 1701-D",
      target: "Kepler-62 f",
      launchDate: "January 4, 2028",
    };

    await httpAddNewLaunch(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls.length).toBe(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  test("should throw an 400 invalid date", async () => {
    const error = "Invalid launch date";
    let req = mockRequest();
    const res = mockResponse();
    req.body = {
      mission: "USS Enterprise",
      rocket: "NCC 1701-D",
      target: "Kepler-62 f",
      launchDate: "Jxxxx",
    };
    await httpAddNewLaunch(req, res);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error });
  });
  test("should 404 if launch not found", async () => {
    const error = "Launch not found";
    let req = mockRequest();
    req.params["id"] = 1000;
    const res = mockResponse();
    await httpAbortLaunch(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error });
  });
  test("should 200 if launch aborting is successfully", async () => {
    const error = "Launch not found";
    let req = mockRequest();
    req.params["id"] = 1000;
    const res = mockResponse();
    await httpAbortLaunch(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error });
  });
  test("should 400 if launch aborting failed", async () => {
    const error = "Launch not aborted";
    await launchesDatabase.create({
      flightNumber: 203,
      mission: "USS Enterprise",
      rocket: "NCC 1701-D",
      target: "Kepler-62 f",
      launchDate: "January 4, 2028",
      upcoming: true,
    });
    await launchesDatabase.updateOne(
      { flightNumber: 203 },
      { upcoming: false, success: false }
    );
    let req = mockRequest();
    req.params["id"] = 203;
    const res = mockResponse();
    await httpAbortLaunch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error });
  });
  test("should 404 if launch not found", async () => {
    const error = "Launch data download failed";
    axios.post = jest.fn(() => Promise.reject(error));
    loadLaunchData().catch((err) => expect(err).toBe(error));
  });
  test("should 200 if launch found", async () => {
    const flightNumber = 203;
    const data = {
      status: 200,
      data: {
        docs: [
          {
            payloads: [
              {
                customers: ["GMDT", "ALNADJAH"],
              },
            ],
            flight_number: flightNumber,
            name: "USS Enterprise",
            rocket: { name: "NCC 1701-D" },
            target: "Kepler-62 f",
            date_local: "January 4, 2028",
            upcoming: true,
            success: true,
          },
        ],
      },
    };
    axios.post = jest.fn(() => Promise.resolve(data));
    const response = await loadLaunchData();
    expect(response).toBeUndefined();
    const expected = JSON.parse(
      JSON.stringify(await launchesDatabase.findOne({ flightNumber }))
    );
    expect(expected.flightNumber).toBe(flightNumber);
  });

  it("should findOne launch...", async () => {
    await launchesDatabase.deleteMany();
    await launchesDatabase.create({
      flightNumber: 203,
      mission: "USS Enterprise",
      rocket: "NCC 1701-D",
      target: "Kepler-62 f",
      launchDate: "January 4, 2028",
      upcoming: true,
    });
    expect(
      JSON.parse(JSON.stringify(await existsLaunchWithId(203))).flightNumber
    ).toBe(203);
    expect(JSON.parse(JSON.stringify(await getAllLaunches())).length).toBe(1);
  });
  test("should throw error if  no match planet name", () => {
    const error = "No matching planet found";
    scheduleNewLaunch({ target: "Test planet" }).catch((err) =>
      expect(err.message).toBe(error)
    );
    error;
  });
});

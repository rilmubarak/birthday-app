import request from "supertest";
import mongoose from "mongoose";
import moment from 'moment-timezone';
import app from "../app";
import User from "../models/User";
import { API_URL } from '../utils/constants';

mongoose.set("strictQuery", true);

describe("User API", () => {
  beforeAll(async () => {
    await mongoose.connect(`${process.env.DB_URL}`);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  test("POST /user should create a new user and set nextBirthdayNotification", async () => {
    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "johndoe@example.com",
      birthday: "2000-12-12",
      location: "Asia/Jakarta",
    };

    const response = await request(app).post(`${API_URL}/user`).send(userData);
    expect(response.status).toBe(201);
    expect(response.body.firstName).toEqual(userData.firstName);
    expect(response.body.nextBirthdayNotification).toBeDefined();

    // Verify that nextBirthdayNotification is correctly set to the upcoming 12-12 at 9 AM Jakarta time in UTC
    const expectedNotification = new Date(response.body.nextBirthdayNotification);
    const userTimezone = userData.location;

    const now = moment.tz(userTimezone);
    let expectedMoment = moment.tz(userData.birthday, "YYYY-MM-DD", userTimezone).year(now.year()).hour(9).minute(0).second(0).millisecond(0);

    if (expectedMoment.isBefore(now)) {
      expectedMoment = expectedMoment.add(1, 'year');
    }

    const expectedUTC = expectedMoment.clone().tz('UTC').toDate();

    expect(expectedNotification.getTime()).toBeCloseTo(expectedUTC.getTime(), -2); // Allowing slight differences
  });

  test("PUT /user/:id should update user details and manage nextBirthdayNotification correctly", async () => {
    const user = new User({
      firstName: "John",
      lastName: "User",
      email: "johndoe@gmail.com",
      birthday: new Date("1990-12-12"),
      location: "Asia/Jakarta",
      nextBirthdayNotification: new Date("2024-12-12T02:00:00Z"), // Example UTC time for Jakarta 9 AM
    });
    await user.save();

    const today = new Date();
    const nextYear = today.getFullYear() + 1;
    const updatedData = {
      birthday: `1990-11-01`,
      location: "Asia/Singapore",
    }; // Updating to next year's birthday & location

    const response = await request(app)
      .put(`${API_URL}/user/${user._id}`)
      .send(updatedData);
    expect(response.status).toBe(200);
    expect(new Date(response.body.birthday)).toEqual(
      new Date(updatedData.birthday)
    );
    expect(response.body.nextBirthdayNotification).toBeDefined();

    // Verify that nextBirthdayNotification is updated correctly
    const expectedNotification = new Date(response.body.nextBirthdayNotification);
    const userTimezone = updatedData.location;

    let expectedMoment = moment.tz(updatedData.birthday, "YYYY-MM-DD", userTimezone).year(nextYear).hour(9).minute(0).second(0).millisecond(0);

    // If the updated birthday is today but past 9 AM, set to next year
    const now = moment.tz(userTimezone);
    if (expectedMoment.isBefore(now)) {
      expectedMoment = expectedMoment.add(1, 'year');
    }

    const expectedUTC = expectedMoment.clone().tz('UTC').toDate();

    expect(expectedNotification.getTime()).toBeCloseTo(expectedUTC.getTime(), -2); // Allowing slight differences
  });

  test("DELETE /user/:id should delete a user", async () => {
    const user = new User({
      firstName: "Test",
      lastName: "User",
      email: "test.user@gmail.com",
      birthday: "1989-03-01",
      location: "Asia/Jakarta",
      nextBirthdayNotification: new Date("2024-03-01T02:00:00Z"),
    });
    await user.save();

    const response = await request(app).delete(`${API_URL}/user/${user._id}`);
    expect(response.status).toBe(200);
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();
  });
});

describe("User API Errors", () => {
  beforeAll(async () => {
    await mongoose.connect(`${process.env.DB_URL}`);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await User.deleteMany({});
    jest.restoreAllMocks();
  });

  test("POST /user should validate user data", async () => {
    const response = await request(app).post(`${API_URL}/user`).send({
      email: "wrong-email",
      location: "invalid-location",
      birthday: "20241148", // Incorrect format
      firstName: "", // Empty
      lastName: "", // Empty
    });

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveLength(5); // Check for five validation errors
  });

  test("POST /user should reject creation if birthday is in the future", async () => {
    const futureDate = moment().add(1, 'days').format("YYYY-MM-DD"); // Tomorrow's date
    const userData = {
      firstName: "Future",
      lastName: "User",
      email: "future.user@example.com",
      birthday: futureDate,
      location: "Asia/Jakarta",
    };

    const response = await request(app).post(`${API_URL}/user`).send(userData);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Birthday cannot be a future date.",
          path: "birthday",
        }),
      ])
    );
  });

  it("POST /user should handle save errors gracefully", async () => {
    // Mock the save method to throw an error
    jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
      return Promise.reject(new Error("Database save error"));
    });

    const response = await request(app)
      .post(`${API_URL}/user`)
      .send({
        firstName: "Test",
        lastName: "User",
        email: "test.user@gmail.com",
        birthday: "1990-06-01",
        location: "Asia/Jakarta",
      });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Server Error");
  });

  test("PUT /user/:id should validate user data", async () => {
    const user = await User.create({
      firstName: "Test",
      lastName: "User",
      email: "test.user@gmail.com",
      birthday: "1990-06-01",
      location: "Asia/Jakarta",
      nextBirthdayNotification: new Date("2024-06-01T02:00:00Z"),
    });

    const response = await request(app).put(`${API_URL}/user/${user._id}`).send({
      email: "wrong-email",
      location: "invalid-location",
      birthday: "20231035", // Incorrect format
      firstName: "", // Empty
      lastName: "", // Empty
    });

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveLength(5); // Check for five validation errors
  });

  it("PUT /user/:id should return 404 for updating non-existent user", async () => {
    const res = await request(app).put(`${API_URL}/user/6732073f4eddaf87f2b7b409`).send({
      firstName: "Nonexistent",
    });
    expect(res.statusCode).toEqual(404);
  });

  test("PUT /user/:id should reject update if birthday is set to a future date", async () => {
    const user = await User.create({
      firstName: "Existing",
      lastName: "User",
      email: "existing.user@example.com",
      birthday: new Date("1990-06-01"),
      location: "Asia/Jakarta",
      nextBirthdayNotification: new Date("2024-06-01T02:00:00Z"),
    });

    const futureDate = moment().add(10, 'days').toISOString(); // 10 days in the future
    const response = await request(app)
      .put(`${API_URL}/user/${user._id}`)
      .send({
        birthday: futureDate,
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Birthday cannot be a future date.",
          path: "birthday",
        }),
      ])
    );
  });

  it("PUT /user/:id should handle save errors gracefully", async () => {
    // Mock the findByIdAndUpdate method to throw an error
    jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => {
      throw new Error("Database save error");
    });

    const user = await User.create({
      firstName: "Test",
      lastName: "User",
      email: "test.user@gmail.com",
      birthday: new Date("1990-06-01"),
      location: "Asia/Jakarta",
      nextBirthdayNotification: new Date("2024-06-01T02:00:00Z"),
    });

    const response = await request(app).put(`${API_URL}/user/${user._id}`).send({
      lastName: "UserEdit",
    });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Server Error");
  });

  it("DELETE /user/:id should return 404 for deleting non-existent user", async () => {
    const res = await request(app).delete(`${API_URL}/user/123456789012345678901234`).send();
    expect(res.statusCode).toEqual(404);
  });

  it("DELETE /user/:id should handle delete errors gracefully", async () => {
    const user = await User.create({
      firstName: "Test",
      lastName: "User",
      email: "test.user@gmail.com",
      birthday: new Date("1990-06-01"),
      location: "Asia/Jakarta",
      nextBirthdayNotification: new Date("2024-06-01T02:00:00Z"),
    });

    // Mock the findByIdAndDelete method to throw an error
    jest.spyOn(User, 'findByIdAndDelete').mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).delete(`${API_URL}/user/${user._id}`).send();

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error", "Server Error");
  });
});

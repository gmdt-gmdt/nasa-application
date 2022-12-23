const { getPagination } = require("./query");
describe("Pagination Testing", () => {
  test("should return skip and limit values", () => {
    const page = 3;
    const { skip, limit } = getPagination({ page, limit: 5 });
    expect(skip).toBe((page - 1) * limit);
    expect(limit).toBe(5);
  });
});

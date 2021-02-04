import frisby from "frisby";

/**
 * Checks error response for missing required fields
 *
 * Usage: `FrisbyResponse.expect('fieldsRequired', ['name'])`
 */
frisby.addExpectHandler("fieldsRequired", (response, expectedFields) => {
  for (const field of expectedFields) {
    expect(response.json.errors).toContain(`${field} must be provided`);
  }
});

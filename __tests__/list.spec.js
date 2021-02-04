import frisby, { Joi } from "frisby";
import Auth from "../fixtures/auth";
import { apiUrl } from "../config";

describe("List (read-only access)", () => {
  beforeAll(() => {
    return Auth.setReadAccess();
  });

  it("cannot be created", () => {
    return frisby
      .post("https://api.themoviedb.org/4/list", {
        name: "My Cool List",
        iso_639_1: "en",
      })
      .expect("status", 401);
  });
});

describe("List (write access)", () => {
  let listId;

  beforeAll(() => {
    return Auth.setWriteAccess();
  });

  afterAll(async () => {
    // Delete the created list to cleanup after test run
    await frisby
      .delete(`${apiUrl}/list/${listId}`)
      .expect("status", 200)
      .expect("json", { success: true });

    // Check, that list is actually deleted
    await frisby.get(`${apiUrl}/list/${listId}`).expect("status", 404);
  });

  it("cannot be created without required fields", async () => {
    await frisby
      .post(`${apiUrl}/list`, {})
      .expect("status", 422)
      .expect("fieldsRequired", ["name", "iso_639_1"]);
  });

  it("cannot be created with invalid field values", async () => {
    await frisby
      .post(`${apiUrl}/list`, {
        name: 1,
        iso_639_1: 1,
        description: 1,
        public: 1,
      })
      // @FIXME API should not return internal error, once
      // fixed on API side, we should update this assertion
      // to check the validation error message
      .expect("status", 500)
      .expect("json", { success: false });
  });

  it("can be created with required fields only", async () => {
    const postValues = {
      name: "My Cool List",
      iso_639_1: "en",
    };
    const response = await frisby
      .post(`${apiUrl}/list`, postValues)
      .expect("status", 201)
      .expect("jsonTypes", { id: Joi.number().required() })
      .expect("json", { success: true });

    // Save the list ID to be used in other test cases
    listId = response.json.id;

    // Check the list existance
    await frisby
      .get(`${apiUrl}/list/${listId}`)
      .expect("status", 200)
      .expect("json", postValues);
  });

  it("cannot be updated with invalid values", async () => {
    await frisby
      .put(`${apiUrl}/list/${listId}`, {
        name: 1,
        iso_639_1: 1,
        description: 1,
        public: 1,
      })
      // @FIXME API should not return internal error, once
      // fixed on API side, we should update this assertion
      // to check the validation error message
      .expect("status", 500)
      .expect("json", { success: false });
  });

  it("can be updated", async () => {
    const updateValues = {
      name: "My Cool Updated List",
      description: "Cool Description",
      public: true,
    };

    // Update the list
    await frisby
      .put(`${apiUrl}/list/${listId}`, updateValues)
      .expect("status", 201)
      .expect("json", { success: true });

    // Check the updated fields in the list
    await frisby
      .get(`${apiUrl}/list/${listId}`)
      .expect("status", 200)
      .expect("json", updateValues);
  });

  describe("items", () => {
    const items = [
      {
        media_id: 652,
        media_type: "movie",
      },
      {
        media_id: 60573,
        media_type: "tv",
      },
    ];

    it("cannot be added without required fields", async () => {
      await frisby
        .post(`${apiUrl}/list/${listId}/items`, {
          items: [
            {
              // Empty item
            },
          ],
        })
        // @FIXME Status code 200 does not seem right, since the items
        // were not added to the list. This should be fixed on API
        // side and this validation should then be updated
        .expect("status", 200)
        .expect("json", "results.*", { success: false });
    });

    it("cannot be added with invalid field values", async () => {
      await frisby
        .post(`${apiUrl}/list/${listId}/items`, {
          items: [
            {
              media_type: "invalid_type",
              media_id: "invalid_media_id",
            },
          ],
        })
        // @FIXME Status code 200 does not seem right, since the items
        // were not added to the list. This should be fixed on API
        // side and this validation should then be updated
        .expect("status", 200)
        .expect("json", "results.*", { success: false });
    });

    it("can be added", async () => {
      await frisby
        .post(`${apiUrl}/list/${listId}/items`, { items })
        .expect("status", 200)
        .expect("json", { success: true, results: items })
        .expect("json", "results.*", { success: true });

      // Check, that the items are available via /list/{listId}/item_status
      for (const item of items) {
        await frisby
          .get(
            `${apiUrl}/list/${listId}/item_status?media_id=${item.media_id}&media_type=${item.media_type}`
          )
          .expect("status", 200)
          .expect("json", item);
      }

      // Remap the items object structure for the /list/{listId} endpoint
      const results = items.map((item) => ({
        id: item.media_id,
        media_type: item.media_type,
      }));

      // Check, that the items are available via /list/{listId}
      await frisby
        .get(`${apiUrl}/list/${listId}`)
        .expect("status", 200)
        .expect("json", { results, total_results: 2 });
    });

    it("cannot be updat non-existent item", async () => {
      await frisby
        .put(`${apiUrl}/list/${listId}/items`, {
          items: [
            {
              media_id: 1,
              media_type: "movie",
              comment: "comment",
            },
          ],
        })
        // @FIXME Status code 200 does not seem right, since the items
        // were not update in the list. This should be fixed on API
        // side and this validation should then be updated
        .expect("status", 200)
        .expect("json", "results.*", { success: false });
    });

    it("cannot update item with invalid values", async () => {
      await frisby
        .put(`${apiUrl}/list/${listId}/items`, {
          items: [
            {
              ...items[0],
              comment: 1,
            },
          ],
        })
        // @FIXME API should not return internal error, once
        // fixed on API side, we should update this assertion
        // to check the validation error message
        .expect("status", 500)
        .expect("json", { success: false });
    });

    it("can be updated", async () => {
      // @FIXME Comment has to be for some reason unique,
      // otherwise api returns status 500
      const comment = `Hello, this is cool. (unique: ${Date.now()})`;
      const item = items[0];

      // Update the list item
      await frisby
        .put(`${apiUrl}/list/${listId}/items`, {
          items: [{ ...item, comment }],
        })
        .expect("status", 200)
        .expect("json", {
          success: true,
          results: [
            {
              ...items[0],
              success: true,
            },
          ],
        });

      // Check the updated list item
      await frisby
        .get(`${apiUrl}/list/${listId}`)
        .expect("status", 200)
        .expect("json", {
          comments: {
            [`${item.media_type}:${item.media_id}`]: comment,
          },
        });
    });

    it("cannot remove non-existent item", async () => {
      await frisby
        .delete(`${apiUrl}/list/${listId}/items`, {
          items: [
            {
              media_type: "tv",
              media_id: 1,
            },
          ],
        })
        // @FIXME Status code 200 does not seem right, since no items
        // were removed from the list. This should be fixed on API
        // side and this validation should then be updated
        .expect("status", 200)
        .expect("json", "results.*", { success: false });
    });

    it("can be removed", async () => {
      const item = items[0];

      // Delete the list item
      await frisby
        .delete(`${apiUrl}/list/${listId}/items`, { items: [item] })
        .expect("status", 200)
        .expect("json", { success: true });

      // Check, that the deleted list item no longer exists
      await frisby
        .get(
          `${apiUrl}/list/${listId}/item_status?media_id=${item.media_id}&media_type=${item.media_type}`
        )
        .expect("status", 404);
    });

    it("can be cleared", async () => {
      const { media_id, media_type } = items[1];

      // Clear all the remaining list items
      await frisby
        .get(`${apiUrl}/list/${listId}/clear`)
        .expect("status", 200)
        .expect("json", {
          items_deleted: 1,
          success: true,
        });

      // Check, tha the remaingin list item no longer exists
      await frisby
        .get(
          `${apiUrl}/list/${listId}/item_status?media_id=${media_id}&media_type=${media_type}`
        )
        .expect("status", 404);
    });
  });
});

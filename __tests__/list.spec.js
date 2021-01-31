import frisby, { Joi } from 'frisby';
import Auth from '../fixtures/auth';
import { apiUrl } from '../config';

describe('List', () => {
    describe('with read-only access', () => {
        beforeAll(() => {
            return Auth.setReadAccess();
        });

        it('cannot be created', () => {
            return frisby
                .post('https://api.themoviedb.org/4/list', {
                    name: 'My Cool List',
                    iso_639_1: 'en'
                })
                .expect('status', 401);
        });
    });

    describe('with write access', () => {
        let listId;

        beforeAll(() => {
            return Auth.setWriteAccess();
        });

        afterAll(async () => {
            await frisby
                .delete(`${apiUrl}/list/${listId}`)
                .expect('status', 200)
                .expect('json', { success: true });
            
            await frisby
                .get(`${apiUrl}/list/${listId}`)
                .expect('status', 404);
        });

        it('can be created with required fields only', async () => {
            const postValues = {
                name: 'My Cool List',
                iso_639_1: 'en'
            };
            const response = await frisby
                .post(`${apiUrl}/list`, postValues)
                .expect('status', 201)
                .expect('jsonTypes', { id: Joi.number().required() })
                .expect('json', { success: true });

            listId = response.json.id;

            await frisby
                .get(`${apiUrl}/list/${listId}`)
                .expect('status', 200)
                .expect('json', postValues);
        });

        it('can be updated', async () => {
            const updateValues = {
                name: 'My Cool Updated List',
                description: 'Cool Description',
                public: true
            };

            await frisby
                .put(`${apiUrl}/list/${listId}`, updateValues)
                .expect('status', 201)
                .expect('json', { success: true });

            await frisby
                .get(`${apiUrl}/list/${listId}`)
                .expect('status', 200)
                .expect('json', updateValues);
        });

        describe('items', () => {
            const items = [
                {
                    media_id: 652,
                    media_type: 'movie'
                },
                {
                    media_id: 60573,
                    media_type: 'tv'
                }
            ];

            it('can be added', async () => {
                await frisby
                    .post(`${apiUrl}/list/${listId}/items`, { items })
                    .expect('status', 200)
                    .expect('json', { success: true, results: items })
                    .expect('json', 'results.*', { success: true });

                for (let item of items) {
                    await frisby
                        .get(`${apiUrl}/list/${listId}/item_status?media_id=${item.media_id}&media_type=${item.media_type}`)
                        .expect('status', 200)
                        .expect('json', item);
                }

                const results = items.map(item => ({ id: item.media_id, media_type: item.media_type }));

                await frisby
                    .get(`${apiUrl}/list/${listId}`)
                    .expect('status', 200)
                    .expect('json', { results, total_results: 2 });
            });

            it('can be updated', async () => {
                // Comment has to be for some reason unique,
                // otherwise api returns status 500
                const comment = `Hello, this is cool. (unique: ${Date.now()})`;
                const item = items[0];

                await frisby
                    .put(`${apiUrl}/list/${listId}/items`, { items: [{ ...item, comment }]})
                    .expect('status', 200)
                    .expect('json', { success: true, results: [{
                        ...items[0],
                        success: true
                    }]});

                await frisby
                    .get(`${apiUrl}/list/${listId}`)
                    .expect('status', 200)
                    .expect('json', { comments: { [`${item.media_type}:${item.media_id}`]: comment }});
            });

            it('can be removed', async () => {
                const item = items[0];

                await frisby
                    .delete(`${apiUrl}/list/${listId}/items`, { items: [item]})
                    .expect('status', 200)
                    .expect('json', { success: true });

                await frisby
                    .get(`${apiUrl}/list/${listId}/item_status?media_id=${item.media_id}&media_type=${item.media_type}`)
                    .expect('status', 404);
            });

            it('can be cleared', async () => {
                const item = items[1];

                await frisby
                    .get(`${apiUrl}/list/${listId}/clear`)
                    .expect('status', 200)
                    .expect('json', {
                        items_deleted: 1,
                        success: true
                    });

                await frisby
                    .get(`${apiUrl}/list/${listId}/item_status?media_id=${item.media_id}&media_type=${item.media_type}`)
                    .expect('status', 404);
            });
        });
    });
});

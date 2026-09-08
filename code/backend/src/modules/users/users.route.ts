import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as usersController from './users.controller.js';

/**
 * Profiles are visible to signed-in students only, never to the open internet — a public
 * directory of names, branches and years is exactly the kind of thing a campus platform should
 * not expose.
 *
 * `/users/me` is declared before `/users/:id` so "me" is never captured as an id.
 *
 * requireAuth is attached per route rather than with `usersRouter.use(requireAuth)`. The router
 * is mounted at `/api`, so a bare `use` would run on every request that reaches it — including
 * ones matching no route at all, which then returned 401 instead of 404 for any unknown API URL.
 */
export const usersRouter = Router();

usersRouter.get('/users/me', requireAuth, usersController.getMe);
usersRouter.patch('/users/me', requireAuth, usersController.updateMe);
usersRouter.post('/users/me/photo', requireAuth, usersController.uploadAvatar);
usersRouter.delete('/users/me/photo', requireAuth, usersController.deleteAvatar);

// Declared before /users/:id so the id route does not swallow it.
usersRouter.get('/users/:id/photo', usersController.getAvatarBytes);
usersRouter.get('/users/:id', requireAuth, usersController.getById);

import type { Request, Response } from 'express';
import { createGoalSchema, feedQuerySchema, updateGoalSchema } from '@campuslink/shared';
import { AppError } from '../../lib/AppError.js';
import * as goalsService from './goals.service.js';

export async function create(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const input = createGoalSchema.parse(req.body);
  res.status(201).json({ goal: await goalsService.createGoal(req.auth.userId, input) });
}

export async function list(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const query = feedQuerySchema.parse(req.query);
  res.json(await goalsService.listGoals(req.auth.userId, query));
}

export async function getById(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ goal: await goalsService.getGoal(req.auth.userId, String(req.params.id)) });
}

export async function update(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const input = updateGoalSchema.parse(req.body);
  res.json({
    goal: await goalsService.updateGoal(req.auth.userId, String(req.params.id), input),
  });
}

export async function cancel(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ goal: await goalsService.cancelGoal(req.auth.userId, String(req.params.id)) });
}

export async function close(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ goal: await goalsService.closeGoal(req.auth.userId, String(req.params.id)) });
}

export async function complete(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ goal: await goalsService.completeGoal(req.auth.userId, String(req.params.id)) });
}

export async function reopen(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ goal: await goalsService.reopenGoal(req.auth.userId, String(req.params.id)) });
}

export async function lobby(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await goalsService.getLobby(req.auth.userId, String(req.params.id)));
}

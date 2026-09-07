import type { Request, Response } from 'express';
import { createGoalSchema, feedQuerySchema } from '@campuslink/shared';
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

export async function cancel(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ goal: await goalsService.cancelGoal(req.auth.userId, String(req.params.id)) });
}

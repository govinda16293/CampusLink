import type { Request, Response } from 'express';
import { submitRatingsSchema } from '@campuslink/shared';
import { AppError } from '../../lib/AppError.js';
import * as ratingsService from './ratings.service.js';

export async function summary(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await ratingsService.ratingSummary(req.auth.userId, String(req.params.id)));
}

export async function submit(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const input = submitRatingsSchema.parse(req.body);
  res
    .status(201)
    .json(await ratingsService.submitRatings(req.auth.userId, String(req.params.id), input));
}

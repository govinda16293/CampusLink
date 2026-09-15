import type { Request, Response } from 'express';
import { joinRequestSchema } from '@campuslink/shared';
import { AppError } from '../../lib/AppError.js';
import * as requestsService from './requests.service.js';

export async function create(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  // No body at all is a request without a note, not a validation failure.
  const input = joinRequestSchema.parse(req.body ?? {});
  res
    .status(201)
    .json(await requestsService.requestToJoin(req.auth.userId, String(req.params.id), input));
}

export async function listForGoal(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await requestsService.listRequestsForGoal(req.auth.userId, String(req.params.id)));
}

export async function accept(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await requestsService.decideRequest(req.auth.userId, String(req.params.id), 'accept'));
}

export async function reject(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await requestsService.decideRequest(req.auth.userId, String(req.params.id), 'reject'));
}

export async function withdraw(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await requestsService.withdrawRequest(req.auth.userId, String(req.params.id)));
}

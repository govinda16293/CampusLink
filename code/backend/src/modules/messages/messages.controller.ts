import type { Request, Response } from 'express';
import { messageQuerySchema, sendMessageSchema } from '@campuslink/shared';
import { AppError } from '../../lib/AppError.js';
import * as messagesService from './messages.service.js';

export async function list(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const query = messageQuerySchema.parse(req.query);
  res.json(await messagesService.listMessages(req.auth.userId, String(req.params.id), query));
}

export async function send(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const input = sendMessageSchema.parse(req.body);
  res
    .status(201)
    .json(await messagesService.sendMessage(req.auth.userId, String(req.params.id), input));
}

import type { Request, Response } from 'express';
import { createReportSchema, reviewReportSchema } from '@campuslink/shared';
import { AppError } from '../../lib/AppError.js';
import * as blocksService from './blocks.service.js';
import * as reportsService from './reports.service.js';
import * as adminService from './admin.service.js';

export async function report(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const input = createReportSchema.parse(req.body);
  res.status(201).json(await reportsService.createReport(req.auth.userId, input));
}

export async function block(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.status(201).json(await blocksService.blockUser(req.auth.userId, String(req.params.id)));
}

export async function unblock(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await blocksService.unblockUser(req.auth.userId, String(req.params.id)));
}

export async function myBlocks(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await blocksService.listBlocks(req.auth.userId));
}

export async function adminReports(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json(await adminService.listReports(status));
}

export async function adminUnmask(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json(await adminService.unmaskReportSubject(req.auth.userId, String(req.params.id)));
}

export async function adminReview(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const input = reviewReportSchema.parse(req.body);
  res.json(await adminService.reviewReport(req.auth.userId, String(req.params.id), input));
}

export async function adminAudit(_req: Request, res: Response) {
  res.json(await adminService.listAuditLog());
}

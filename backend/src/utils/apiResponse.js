export function ok(res, data = null, message = 'success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created(res, data = null, message = 'created') {
  return ok(res, data, message, 201);
}

export function paginated(res, { rows, count, page, pageSize }) {
  return res.status(200).json({
    success: true,
    message: 'success',
    data: {
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: pageSize > 0 ? Math.ceil(count / pageSize) : 0,
    },
  });
}

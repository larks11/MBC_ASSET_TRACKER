import asyncHandler from "../utils/asyncHandler.js";
import httpError from "../utils/httpError.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function crud(
  Model,
  { searchFields = [], filterFields = [], populate, dateField, defaultSort = "-createdAt" } = {}
) {
  const withPopulate = (q) => (populate ? q.populate(populate) : q);

  return {
    list: asyncHandler(async (req, res) => {
      const { page = 1, limit = 10, search, sort = defaultSort, from, to, ...rest } = req.query;

      const filter = {};
      for (const f of filterFields) {
        if (rest[f] !== undefined && rest[f] !== "") filter[f] = rest[f];
      }
      if (search && searchFields.length) {
        const rx = new RegExp(escapeRegex(String(search).trim()), "i");
        filter.$or = searchFields.map((f) => ({ [f]: rx }));
      }
      if (dateField && (from || to)) {
        filter[dateField] = {};
        if (from) filter[dateField].$gte = new Date(from);
        if (to) filter[dateField].$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
      }

      const p = Math.max(parseInt(page, 10) || 1, 1);
      const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 1000);

      const [data, total] = await Promise.all([
        withPopulate(Model.find(filter).sort(sort).skip((p - 1) * l).limit(l)).lean(),
        Model.countDocuments(filter),
      ]);

      res.json({ data, meta: { total, page: p, limit: l, pages: Math.ceil(total / l) || 1 } });
    }),

    get: asyncHandler(async (req, res) => {
      const doc = await withPopulate(Model.findById(req.params.id));
      if (!doc) throw httpError(404, `${Model.modelName} not found`);
      res.json(doc);
    }),

    create: asyncHandler(async (req, res) => {
      const doc = await Model.create(req.body);
      if (populate) await doc.populate(populate);
      res.status(201).json(doc);
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) throw httpError(404, `${Model.modelName} not found`);
      const { _id, createdAt, updatedAt, ...body } = req.body;
      doc.set(body);
      await doc.save();
      if (populate) await doc.populate(populate);
      res.json(doc);
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw httpError(404, `${Model.modelName} not found`);
      res.json({ message: `${Model.modelName} deleted` });
    }),
  };
}

// @ts-nocheck
import { Router } from '../lib/miniExpress.js';
import { authenticate } from '../middleware/authenticate.js';
import { pantryRepository } from '../repositories/inMemoryPantryRepository.js';
export const pantryRoutes = Router();
pantryRoutes.get('/pantry', authenticate, (req, res) => {
    const items = pantryRepository.listByOwner(req.user.id);
    res.json({ items });
});
pantryRoutes.put('/pantry', authenticate, (req, res) => {
    const { items } = req.body ?? {};
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'items array is required' });
        return;
    }
    const upserted = items
        .filter((item) => item?.name)
        .map((item) => {
        const status = normalizeStatus(item.status);
        return pantryRepository.upsert({
            ownerId: req.user.id,
            name: String(item.name),
            status,
            quantity: item.quantity,
            unit: item.unit,
        });
    });
    res.json({ items: upserted });
});
function normalizeStatus(status) {
    if (!status)
        return 'HAVE';
    const normalized = status.toUpperCase();
    if (normalized === 'HAVE' || normalized === 'LOW' || normalized === 'OUT')
        return normalized;
    return 'HAVE';
}

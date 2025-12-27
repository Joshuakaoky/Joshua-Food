// @ts-nocheck
import { Router } from '../lib/miniExpress.js';
import { authenticate } from '../middleware/authenticate.js';
import { dishRepository } from '../repositories/inMemoryDishRepository.js';
export const dishRoutes = Router();
dishRoutes.get('/dishes', (_req, res) => {
    res.json({ dishes: dishRepository.listAll() });
});
dishRoutes.get('/dishes/:id', (req, res) => {
    const dish = dishRepository.findById(req.params?.id ?? '');
    if (!dish) {
        res.status(404).json({ message: 'Dish not found' });
        return;
    }
    res.json({ dish });
});
dishRoutes.post('/dishes', authenticate, (req, res) => {
    const { title, coverUrl, photos, intro, tags, ingredients } = req.body ?? {};
    const parsedIngredients = normalizeIngredients(ingredients);
    if (!title || !coverUrl || parsedIngredients.length === 0) {
        res.status(400).json({ message: 'title, coverUrl and at least one ingredient are required' });
        return;
    }
    const dish = dishRepository.create({
        ownerId: req.user.id,
        title,
        coverUrl,
        photos,
        intro,
        tags,
        ingredients: parsedIngredients,
    });
    res.status(201).json({ dish });
});
dishRoutes.put('/dishes/:id', authenticate, (req, res) => {
    const dish = dishRepository.findById(req.params?.id ?? '');
    if (!dish) {
        res.status(404).json({ message: 'Dish not found' });
        return;
    }
    if (dish.ownerId !== req.user.id) {
        res.status(403).json({ message: 'Only the owner can update this dish' });
        return;
    }
    const updates = {};
    const { title, coverUrl, photos, intro, tags, ingredients, status } = req.body ?? {};
    if (title)
        updates.title = title;
    if (coverUrl)
        updates.coverUrl = coverUrl;
    if (photos)
        updates.photos = photos;
    if (intro)
        updates.intro = intro;
    if (tags)
        updates.tags = tags;
    if (ingredients) {
        const parsed = normalizeIngredients(ingredients);
        if (parsed.length === 0) {
            res.status(400).json({ message: 'ingredients must include at least one item' });
            return;
        }
        updates.ingredients = parsed;
    }
    if (status) {
        if (!['ACTIVE', 'INACTIVE'].includes(status)) {
            res.status(400).json({ message: 'status must be ACTIVE or INACTIVE' });
            return;
        }
        updates.status = status;
    }
    const updated = dishRepository.update(dish.id, updates);
    res.json({ dish: updated });
});
function normalizeIngredients(ingredients) {
    if (!Array.isArray(ingredients))
        return [];
    return ingredients
        .filter((item) => item?.name)
        .map((item) => ({
        name: String(item.name),
        quantity: item.quantity,
        unit: item.unit,
    }));
}

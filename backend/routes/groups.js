import express from 'express';
import { db } from '../db.js';
import {
    listGroups,
    createGroup,
    renameGroup,
    deleteGroup
} from '../group-store.js';

const router = express.Router();

router.get('/groups', (req, res) => {
    try {
        const groups = listGroups(db);
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/groups', (req, res) => {
    try {
        const { id, name } = req.body || {};
        const group = createGroup(db, { id, name });
        res.status(201).json(group);
    } catch (err) {
        const status = err.status || (err.message === 'Group name already exists' || err.message === 'Group name is required' ? 400 : 500);
        res.status(status).json({ error: err.message });
    }
});

router.patch('/groups/:id', (req, res) => {
    try {
        const { name } = req.body || {};
        const group = renameGroup(db, req.params.id, name);
        res.json(group);
    } catch (err) {
        const status = err.status || (err.message === 'Group name already exists' || err.message === 'Group name is required'
            ? 400
            : err.message === 'Group not found'
                ? 404
                : 500);
        res.status(status).json({ error: err.message });
    }
});

router.delete('/groups/:id', (req, res) => {
    try {
        deleteGroup(db, req.params.id);
        res.json({ success: true });
    } catch (err) {
        const status = err.status || (err.message === 'Group not found'
            ? 404
            : 400);
        res.status(status).json({ error: err.message });
    }
});

export default router;

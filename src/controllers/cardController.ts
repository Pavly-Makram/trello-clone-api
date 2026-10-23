import { Request, Response } from "express";
import * as cardService from "../services/cardService";

/**
 * @description Create New Card
 * @route /api/cards
 * @method post
 * @access public
 */
export const createNewCard = async (req: Request, res: Response) => {
    const card = await cardService.createNewCard(req.body, req.user!.id);

    return res.status(201).json({
        message: "Card created successfully",
        card,
    });
};

/**
 * @description Get All Cards
 * @route /api/cards
 * @method get
 * @access public
 */
export const getAllCards = async (req: Request, res: Response) => {
    const cards = await cardService.getAllCards(req.query as any);

    return res.status(200).json({
        message: "Cards retrieved successfully",
        cards,
    });
};

/**
 * @description Get Card By Id
 * @route /api/cards/:id
 * @method get
 * @access public
 */
export const getCardById = async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);
    const card = await cardService.getCardById(cardId);

    return res.status(200).json({
        message: "Card retrieved successfully",
        card,
    });
};

/**
 * @description Update Card
 * @route /api/cards/:id
 * @method patch
 * @access private (Owner , Admin , Member)
 */
export const updateCard = async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);
    const card = await cardService.updateCard(cardId, req.body, req.user!.id);

    return res.status(200).json({
        message: "Card updated successfully",
        card,
    });
};

/**
 * @description Delete Card     
 * @route /api/cards/:id
 * @method delete                
 * @access private (Owner , Admin , Member)
 */
export const deleteCard = async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);
    await cardService.deleteCard(cardId, req.user!.id);

    return res.status(200).json({
        message: "Card deleted successfully",
    });
};

/**
 * @description Move Card
 * @route /api/cards/:id/move
 * @method patch
 * @access private (Owner , Admin , Member)
 */
export const moveCard = async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);
    const card = await cardService.moveCard(cardId, req.body, req.user!.id);

    return res.status(200).json({
        message: "Card moved successfully",
        card,
    });
};

/**
 * @description Assign User To Card
 * @route /api/cards/:id/assignees
 * @method post
 * @access private (Owner , Admin , Member)
 */
export const assignUser = async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);
    const { userId } = req.body;
    const output_card = await cardService.assignUser(cardId, userId);

    return res.status(201).json({
        message: "User assigned successfully",
        output_card,
    });
};

/**
 * @description Remove assignee from User     
 * @route /api/cards/:id/assignees/:userId
 * @method delete                
 * @access private (Owner , Admin , Member)
 */

export const unassignUser = async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);
    const userId = Number(req.params.userId);
    await cardService.unassignUser(cardId, userId);

    return res.status(200).json({
        message: "User unassigned successfully",
    });
};
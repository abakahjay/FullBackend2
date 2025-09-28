const express = require("express");
const mongoose = require("mongoose");
const Meals = require("../models/Meals");
const { ObjectId } = require("mongodb");
const { UnauthenticatedError, BadRequestError, NotFoundError } = require("../errors");
const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");

const router = express.Router();

/**
 * Caterer/Admin: Create a new meal
 */
router.post("/", async (req, res) => {
    const { image, name, priceCents, type, createdBy } = req.body;

    if (!image) throw new BadRequestError("Please provide meal image");
    if (!name) throw new BadRequestError("Please provide meal name");
    if (!priceCents) throw new BadRequestError("Please provide meal price");

    if (!createdBy) throw new BadRequestError("Please provide createdBy (user ID)");

    const user = await User.findById(createdBy);
    if (!user) throw new NotFoundError(`No User found with id:${createdBy}`);

    const meal = new Meals({
        image,
        name,
        priceCents,
        type,
        createdBy,
    });

    await meal.save();

    console.log(
        "\x1b[34m%s\x1b[0m",
        `Meal created: ${meal.name} (₵${meal.priceCents / 100})`
    );

    res.status(StatusCodes.CREATED).json({ message: "Meal created successfully", meal });
});

/**
 * Public: Get all meals
 */
router.get("/", async (req, res) => {
    const meals = await Meals.find().populate("createdBy", "name email");

    console.log("\x1b[36m%s\x1b[0m", `Retrieved ${meals.length} meals`);

    res.status(StatusCodes.OK).json({
        nbHits: meals.length,
        meals,
    });
});

/**
 * Public: Get single meal by ID
 */
router.get("/:mealId", async (req, res) => {
    const { mealId } = req.params;
    if (!mealId) throw new BadRequestError("Please provide mealId");

    const meal = await Meals.findById(mealId).populate("createdBy", "name email");
    if (!meal) throw new NotFoundError(`No meal found with id:${mealId}`);

    console.log("\x1b[36m%s\x1b[0m", `Retrieved meal: ${meal.name}`);

    res.status(StatusCodes.OK).json({ meal });
});

/**
 * Caterer/Admin: Update meal details
 */
router.patch("/:mealId", async (req, res) => {
    const { mealId } = req.params;
    if (!mealId) throw new BadRequestError("Please provide mealId");

    const meal = await Meals.findByIdAndUpdate(mealId, req.body, {
        new: true,
        runValidators: true,
    });

    if (!meal) throw new NotFoundError(`No meal found with id:${mealId}`);

    console.log(
        "\x1b[33m%s\x1b[0m",
        `Meal ${mealId} updated successfully`
    );

    res.status(StatusCodes.OK).json({ message: "Meal updated successfully", meal });
});

/**
 * Caterer/Admin: Delete meal
 */
router.delete("/:mealId", async (req, res) => {
    const { mealId } = req.params;
    if (!mealId) throw new BadRequestError("Please provide mealId");

    const meal = await Meals.findOneAndDelete({ _id: new ObjectId(mealId) });
    if (!meal) throw new NotFoundError(`No meal found with id:${mealId}`);

    console.log("\x1b[31m%s\x1b[0m", `Meal ${mealId} deleted`);

    res.status(StatusCodes.OK).json({ message: "Meal deleted successfully", meal });
});

module.exports = router;

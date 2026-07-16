import mongoose from "mongoose";
import AffiliatePartner from "../models/affiliate.js";
import Enrollment from "../models/enrollment.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const addAffiliatePartner = async (req, res) => {
  try {
    let { fullName, mobileNumber, email, address, status } = req.body;

    fullName = fullName?.trim();
    mobileNumber = mobileNumber?.trim();
    email = email?.trim().toLowerCase();
    status = status?.trim().toUpperCase();

    if (!fullName || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and mobile number are required.",
      });
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number.",
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email.",
        });
      }
    }

    const alreadyExists = await AffiliatePartner.findOne({
      $or: [
        {
          mobileNumber,
        },
        ...(email
          ? [
              {
                email,
              },
            ]
          : []),
      ],
    });

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "Affiliate partner already exists.",
      });
    }

    const affiliate = await AffiliatePartner.create({
      fullName,
      mobileNumber,
      email,
      address,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Affiliate partner added successfully.",
      data: affiliate,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getAffiliatePartnerForEdit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid affiliate partner ID.",
      });
    }

    const affiliate = await AffiliatePartner.findById(id)
      .select("fullName mobileNumber email address status")
      .lean();

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate partner not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Affiliate partner fetched successfully.",
      data: affiliate,
    });
  } catch (error) {
    console.error("Get affiliate partner for edit error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const updateAffiliatePartner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid affiliate partner ID.",
      });
    }

    let { fullName, mobileNumber, email, address, status } = req.body;

    fullName = fullName?.trim();
    mobileNumber = mobileNumber?.trim();
    email = email?.trim().toLowerCase();
    address = address?.trim();
    status = status?.trim().toUpperCase();

    const affiliate = await AffiliatePartner.findById(id);

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate partner not found.",
      });
    }

    if (mobileNumber) {
      if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mobile number.",
        });
      }

      const mobileExists = await AffiliatePartner.findOne({
        mobileNumber,
        _id: { $ne: id },
      });

      if (mobileExists) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already exists.",
        });
      }

      affiliate.mobileNumber = mobileNumber;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email.",
        });
      }

      const emailExists = await AffiliatePartner.findOne({
        email,
        _id: { $ne: id },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already exists.",
        });
      }

      affiliate.email = email;
    }

    if (status) {
      const allowedStatus = ["ACTIVE", "INACTIVE"];

      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be ACTIVE or INACTIVE.",
        });
      }

      affiliate.status = status;
    }

    if (fullName) affiliate.fullName = fullName;
    if (address !== undefined) affiliate.address = address;

    await affiliate.save();

    return res.status(200).json({
      success: true,
      message: "Affiliate partner updated successfully.",
      data: affiliate,
    });
  } catch (error) {
    console.error("Update affiliate partner error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const deleteAffiliatePartner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid affiliate partner ID.",
      });
    }

    const affiliate = await AffiliatePartner.findById(id);

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate partner not found.",
      });
    }

    await AffiliatePartner.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Affiliate partner deleted successfully.",
    });
  } catch (error) {
    console.error("Delete affiliate partner error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getAllAffiliatePartners = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      year = new Date().getFullYear(),
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);

    const skip = (page - 1) * limit;

    year = parseInt(year);

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const match = {};

    if (search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");

      match.$or = [
        { fullName: regex },
        { mobileNumber: regex },
        { email: regex },
      ];
    }

    let sortStage = {
      createdAt: -1,
    };

    if (["totalCourseSold", "totalRevenue", "createdAt"].includes(sortBy)) {
      sortStage = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };
    }

    const result = await AffiliatePartner.aggregate([
      {
        $match: match,
      },

      {
        $lookup: {
          from: "enrollments",
          let: {
            affiliateId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$affiliatePartnerId", "$$affiliateId"],
                },
                enrollmentDate: {
                  $gte: startDate,
                  $lte: endDate,
                },
              },
            },

            {
              $lookup: {
                from: "courses",
                localField: "courseId",
                foreignField: "_id",
                as: "course",
              },
            },

            {
              $unwind: {
                path: "$course",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $project: {
                sellingPrice: {
                  $ifNull: ["$course.discountedPrice", "$course.actualPrice"],
                },
              },
            },
          ],
          as: "sales",
        },
      },

      {
        $addFields: {
          totalCourseSold: {
            $size: "$sales",
          },

          totalRevenue: {
            $sum: "$sales.sellingPrice",
          },
        },
      },

      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          email: 1,
          status: 1,
          totalCourseSold: 1,
          totalRevenue: 1,
          createdAt: 1,
        },
      },

      {
        $sort: sortStage,
      },

      {
        $facet: {
          affiliates: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],

          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const affiliates = result[0]?.affiliates || [];

    const totalAffiliates = result[0]?.totalCount?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      message: "Affiliate partners fetched successfully.",

      data: affiliates,

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalAffiliates / limit),
        totalAffiliates,
        limit,
        hasNextPage: page < Math.ceil(totalAffiliates / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get affiliate partners error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

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

// /api/affiliate?sortBy=totalRevenue&sortOrder=desc
export const getAllAffiliatePartners = async (req, res) => {
  try {
    // let {
    //   page = 1,
    //   limit = 10,
    //   search = "",
    //   year = new Date().getFullYear(),
    //   sortBy = "createdAt",
    //   sortOrder = "desc",
    // } = req.query;

    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 10;

    const search = req.query.search?.trim() || "";

    let year = Number(req.query.year) || new Date().getFullYear();

    let sortBy = req.query.sortBy || "createdAt";
    let sortOrder = req.query.sortOrder || "desc";

    if (!["createdAt", "totalCourseSold", "totalRevenue"].includes(sortBy)) {
      sortBy = "createdAt";
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      sortOrder = "desc";
    }

    const skip = (page - 1) * limit;

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
                  $eq: ["$affiliatePartner", "$$affiliateId"],
                },
                enrollmentDate: {
                  $gte: startDate,
                  $lte: endDate,
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
            $sum: "$sales.courseTotalFee",
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

// /api/affiliate/:id?year=2026

export const getAffiliatePartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid affiliate partner ID.",
      });
    }

    // let { year = new Date().getFullYear() } = req.query;

    // year = parseInt(year);

    // const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    // const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const currentDate = new Date();

    // Year
    let year = Number(req.query.year);

    if (isNaN(year)) {
      year = currentDate.getFullYear();
    }

    // Month
    let month = Number(req.query.month);

    if (isNaN(month) || month < 1 || month > 12) {
      month = currentDate.getMonth() + 1;
    }

    // Selected month's first day
    const startDate = new Date(year, month - 1, 1);

    // Selected month's last day
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const affiliate = await AffiliatePartner.findById(id).lean();

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate partner not found.",
      });
    }

    const enrollments = await Enrollment.find({
      affiliatePartner: id,
      enrollmentDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate({
        path: "studentId",
        select: "fullName mobileNumber",
      })
      .populate({
        path: "courseId",
        select: "name type actualPrice discountedPrice",
      })
      .sort({
        enrollmentDate: -1,
      })
      .lean();

    const courseList = enrollments.map((item) => ({
      enrollmentId: item._id,

      studentId: item.studentId?._id,

      studentName: item.studentId?.fullName || "",

      mobileNumber: item.studentId?.mobileNumber || "",

      courseId: item.courseId?._id,

      courseName: item.courseId?.name || "",

      courseType: item.courseId?.type || "",

      sellingPrice:
        item.courseId?.discountedPrice ?? item.courseId?.actualPrice ?? 0,

      paymentStatus: item.paymentStatus,

      totalPaidAmount: item.totalPaidAmount,

      remainingAmount: item.remainingAmount,

      enrollmentDate: item.enrollmentDate,
    }));

    const totalCourseSold = courseList.length;

    const totalRevenue = courseList.reduce(
      (sum, item) => sum + item.sellingPrice,
      0,
    );

    return res.status(200).json({
      success: true,
      message: "Affiliate partner fetched successfully.",

      data: {
        affiliate: {
          _id: affiliate._id,
          fullName: affiliate.fullName,
          mobileNumber: affiliate.mobileNumber,
          email: affiliate.email,
          address: affiliate.address,
          status: affiliate.status,
        },

        summary: {
          year,
          totalCourseSold,
          totalRevenue,
        },

        courses: courseList,
      },
    });
  } catch (error) {
    console.error("Get affiliate partner by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getActiveAffiliatePartnersDropdown = async (req, res) => {
  try {
    const affiliates = await AffiliatePartner.find({
      status: "ACTIVE",
    })
      .select("_id fullName")
      .sort({ fullName: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Active affiliate partners fetched successfully.",
      data: affiliates,
    });
  } catch (error) {
    console.error(
      "Get active affiliate partners dropdown error:",
      error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

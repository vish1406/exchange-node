import { nanoid } from "nanoid";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { IMAGE_FORMATS, deleteImageFromS3, uploadImageToS3 } from "../../lib/files/image-upload.js";
import { checkImageExist } from "../../lib/helpers/images.js";
import Currency from "../../models/v1/Currency.js";
import ThemeSetting, { THEME_IMAGE_SIZES, THEME_IMAGE_TYPES } from "../../models/v1/ThemeSetting.js";
import User from "../../models/v1/User.js";

const uploadThemeImages = async (themeSettingId, files) => {
  const themeSetting = await ThemeSetting.findById(themeSettingId);

  const { bannerImages = [], welcomeMobileImage, welcomeDesktopImage, logo } = files;

  const imagePromises = [];

  const bannerImageNames = [];

  // Generates image size promises for given type
  const imageSizePromises = (themeSetting, image, type, name = "") => {
    const imagePromises = [];
    const sizes = [
      THEME_IMAGE_SIZES[type].ORIGINAL,
      THEME_IMAGE_SIZES[type].DEFAULT,
      THEME_IMAGE_SIZES[type].THUMBNAIL,
    ];
    sizes.forEach((size) => {
      const path = themeSetting.generateImagePath(type, size, name);
      imagePromises.push(uploadImageToS3({ image, path, size, format: IMAGE_FORMATS.PNG }));
    });
    return imagePromises;
  };

  // Banner Images
  if (bannerImages.length) {
    bannerImages.forEach((image) => {
      const name = nanoid();
      bannerImageNames.push(name);
      imagePromises.push(...imageSizePromises(themeSetting, image, THEME_IMAGE_TYPES.BANNER, name));
    });
  }

  // Welcome Image Mobile
  if (welcomeMobileImage) {
    imagePromises.push(...imageSizePromises(themeSetting, welcomeMobileImage, THEME_IMAGE_TYPES.WELCOME_MOBILE));
  }

  // Welcome Image Desktop
  if (welcomeDesktopImage) {
    imagePromises.push(...imageSizePromises(themeSetting, welcomeDesktopImage, THEME_IMAGE_TYPES.WELCOME_DESKTOP));
  }

  // Logo
  if (logo) {
    imagePromises.push(...imageSizePromises(themeSetting, logo, THEME_IMAGE_TYPES.LOGO));
  }

  await Promise.all(imagePromises);

  if (bannerImageNames.length) {
    themeSetting.bannerImages.push(...bannerImageNames);
    await themeSetting.save();
  }
};

/**
 * Fetch themeSetting by Id from the database
 */
const fetchThemeSettingId = async (userId) => {
  try {
    const existingThemeSetting = await ThemeSetting.findOne({ userId: userId });
    if (!existingThemeSetting) {
      return [];
    }

    // Banner Images
    const bannerImages = [];
    if (existingThemeSetting.bannerImages?.length) {
      for (const imageName of existingThemeSetting.bannerImages) {
        const path = await checkImageExist(
          await existingThemeSetting.getImageUrl(THEME_IMAGE_TYPES.BANNER, THEME_IMAGE_SIZES.BANNER.DEFAULT, imageName)
        );
        bannerImages.push({
          name: imageName,
          url: path,
        });
      }
    }

    // Mobile Welcome Image
    const welcomeMobileImage = await checkImageExist(
      await existingThemeSetting.getImageUrl(THEME_IMAGE_TYPES.WELCOME_MOBILE, THEME_IMAGE_SIZES.WELCOME_MOBILE.DEFAULT)
    );

    // Desktop Welcome Image
    const welcomeDesktopImage = await checkImageExist(
      await existingThemeSetting.getImageUrl(
        THEME_IMAGE_TYPES.WELCOME_DESKTOP,
        THEME_IMAGE_SIZES.WELCOME_DESKTOP.DEFAULT
      )
    );

    // Desktop Logo
    let logoImage = await checkImageExist(
      await existingThemeSetting.getImageUrl(THEME_IMAGE_TYPES.LOGO, THEME_IMAGE_SIZES.LOGO.DEFAULT)
    );

    const data = {
      ...existingThemeSetting._doc,
      bannerImages,
      welcomeMobileImage,
      welcomeDesktopImage,
      logoImage,
    };

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update themeSetting in the database
 */
const modifyThemeSetting = async ({ files, ...reqBody }) => {
  try {
    const themeSetting = await ThemeSetting.findOne({ userId: reqBody.userId });

    if (!themeSetting) {
      const {
        userId,
        facebookLink,
        twitterLink,
        instagramLink,
        telegramLink,
        youtubeLink,
        whatsappLink,
        blogLink,
        footerMessage,
        news,
        supportNumber,
        forgotPasswordLink,
        depositePopupNumber,
        welcomeMessage,
        welcomeMessageMobile,
      } = reqBody;

      const newThemeSettingObj = {
        userId,
        facebookLink,
        twitterLink,
        instagramLink,
        telegramLink,
        youtubeLink,
        whatsappLink,
        blogLink,
        footerMessage,
        news,
        supportNumber,
        forgotPasswordLink,
        depositePopupNumber,
        welcomeMessage,
        welcomeMessageMobile,
      };

      const newThemeSetting = await ThemeSetting.create(newThemeSettingObj);

      await uploadThemeImages(newThemeSetting._id, files);

      return newThemeSetting;
    } else {
      themeSetting.facebookLink = reqBody.facebookLink;
      themeSetting.twitterLink = reqBody.twitterLink;
      themeSetting.instagramLink = reqBody.instagramLink;
      themeSetting.telegramLink = reqBody.telegramLink;
      themeSetting.youtubeLink = reqBody.youtubeLink;
      themeSetting.whatsappLink = reqBody.whatsappLink;
      themeSetting.blogLink = reqBody.blogLink;
      themeSetting.footerMessage = reqBody.footerMessage;
      themeSetting.news = reqBody.news;
      themeSetting.supportNumber = reqBody.supportNumber;
      themeSetting.forgotPasswordLink = reqBody.forgotPasswordLink;
      themeSetting.hardBetDeleted = reqBody.hardBetDeleted;
      themeSetting.depositePopupNumber = reqBody.depositePopupNumber;
      themeSetting.welcomeMessage = reqBody.welcomeMessage;
      themeSetting.welcomeMessageMobile = reqBody.welcomeMessageMobile;

      await themeSetting.save();

      await uploadThemeImages(themeSetting._id, files);

      return themeSetting;
    }
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const deleteBannerImage = async ({ _id: themeSettingId, bannerImageName }) => {
  try {
    const themeSetting = await ThemeSetting.findById(themeSettingId);

    if (!themeSetting) {
      throw new Error("Theme Setting not found!");
    }

    if (!themeSetting.bannerImages.includes(bannerImageName)) {
      throw new Error("Banner Image not found!");
    }

    const imagePromises = [];

    const sizes = [
      THEME_IMAGE_SIZES.BANNER.ORIGINAL,
      THEME_IMAGE_SIZES.BANNER.DEFAULT,
      THEME_IMAGE_SIZES.BANNER.THUMBNAIL,
    ];

    sizes.forEach((size) => {
      const path = themeSetting.generateImagePath(THEME_IMAGE_TYPES.BANNER, size, bannerImageName);
      imagePromises.push(deleteImageFromS3({ path }));
    });

    await Promise.all(imagePromises);

    themeSetting.bannerImages = themeSetting.bannerImages.filter((image) => image !== bannerImageName);

    return await themeSetting.save();
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * get themeSetting for superadmin in the database
 */
const getThemeSettingByCurrencyAndDomain = async ({ ...reqBody }) => {
  try {
    const { countryName, domainUrl } = reqBody;

    let currencyId = null;
    const regex = new RegExp(`^${countryName}$`, "i");
    let currency = await Currency.findOne({ countryName: { $regex: regex } }).select("_id");
    if (!currency) {
      currency = await Currency.findOne({ name: { $regex: "inr" } }).select("_id");
      if (!currency) {
        return {};
      }
    }
    currencyId = currency._id;

    const superAdmin = await User.findOne({ currencyId: currencyId, domainUrl: domainUrl }, { "_id": 1, "businessType": 1 });
    if (!superAdmin) {
      return {};
    }

    const themeSettings = await ThemeSetting.findOne({ userId: superAdmin._id });
    if (!themeSettings) {
      return {};
    }

    const bannerPromises = [];
    const fetchBannerImage = async (imageName) => {
      const path = await themeSettings.getImageUrl(
        THEME_IMAGE_TYPES.BANNER,
        THEME_IMAGE_SIZES.BANNER.ORIGINAL,
        imageName
      );
      return { name: imageName, url: path };
    };
    if (themeSettings.bannerImages?.length) {
      for (const imageName of themeSettings.bannerImages) {
        bannerPromises.push(fetchBannerImage(imageName));
      }
    }

    const imagePromises = [];
    imagePromises.push(Promise.all(bannerPromises));
    imagePromises.push(themeSettings.getImageUrl(THEME_IMAGE_TYPES.WELCOME_MOBILE));
    imagePromises.push(themeSettings.getImageUrl(THEME_IMAGE_TYPES.WELCOME_DESKTOP));
    imagePromises.push(themeSettings.getImageUrl(THEME_IMAGE_TYPES.LOGO));
    const [bannerImages, welcomeMobileImage, welcomeDesktopImage, logoImage] = await Promise.all(imagePromises);

    const data = {
      ...themeSettings._doc,
      bannerImages,
      welcomeMobileImage,
      welcomeDesktopImage,
      logoImage,
      currencyId,
      businessType: superAdmin.businessType || null
    };

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchThemeSettingId,
  modifyThemeSetting,
  deleteBannerImage,
  getThemeSettingByCurrencyAndDomain,
};

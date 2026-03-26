import db from "../db.js";

const SETTINGS_KEY = "admin";

const defaultSettings = {
  featureAccess: {
    dashboardReports: true,
    bulkEvaluation: true,
    managerStudentView: true,
    scholarSelfEnrollment: false,
  },
  notifications: {
    reportEmailsEnabled: false,
    assignmentAlertsEnabled: true,
  },
  policies: {
    allowResubmissions: true,
    scholarProfileEditing: true,
    evaluationVisibility: "after-grading",
  },
};

const mergeSettings = (value = {}) => ({
  ...defaultSettings,
  ...value,
  featureAccess: {
    ...defaultSettings.featureAccess,
    ...(value.featureAccess || {}),
  },
  notifications: {
    ...defaultSettings.notifications,
    ...(value.notifications || {}),
  },
  policies: {
    ...defaultSettings.policies,
    ...(value.policies || {}),
  },
});

const getAdminSettings = async () => {
  const setting = await db.systemSetting.findUnique({
    where: {
      key: SETTINGS_KEY,
    },
  });

  return mergeSettings(setting?.value || {});
};

const updateAdminSettings = async (patch, updatedById) => {
  const currentSettings = await getAdminSettings();
  const nextSettings = mergeSettings({
    ...currentSettings,
    ...patch,
    featureAccess: {
      ...currentSettings.featureAccess,
      ...(patch.featureAccess || {}),
    },
    notifications: {
      ...currentSettings.notifications,
      ...(patch.notifications || {}),
    },
    policies: {
      ...currentSettings.policies,
      ...(patch.policies || {}),
    },
  });

  await db.systemSetting.upsert({
    where: {
      key: SETTINGS_KEY,
    },
    update: {
      value: nextSettings,
      updatedById: updatedById || null,
    },
    create: {
      key: SETTINGS_KEY,
      value: nextSettings,
      updatedById: updatedById || null,
    },
  });

  return nextSettings;
};

export { defaultSettings, getAdminSettings, updateAdminSettings };

import db from "../db.js";

const mapResource = (resource) => ({
  id: resource.id,
  title: resource.title,
  description: resource.description,
  url: resource.url || resource.fileUrl || "",
  fileUrl: resource.fileUrl,
  resourceType: resource.resourceType,
  createdAt: resource.createdAt,
});

const buildMetadataFromProgramme = (programme) => {
  const resources = Array.isArray(programme.resources) ? programme.resources : [];

  return {
    selfEnrollmentEnabled: !!programme.selfEnrollmentEnabled,
    spotlightTitle: programme.spotlightTitle || "",
    spotlightMessage: programme.spotlightMessage || "",
    resources: resources
      .filter((resource) => resource.resourceType !== "meeting_link")
      .map(mapResource),
    meetingLinks: resources
      .filter((resource) => resource.resourceType === "meeting_link")
      .map(mapResource),
  };
};

const withProgrammeMetadataSync = (programme) => ({
  ...programme,
  ...buildMetadataFromProgramme(programme),
});

const getProgrammeMetadata = async (programmeId) => {
  const programme = await db.programme.findUnique({
    where: {
      id: programmeId,
    },
    include: {
      resources: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!programme) {
    return {
      selfEnrollmentEnabled: false,
      spotlightTitle: "",
      spotlightMessage: "",
      resources: [],
      meetingLinks: [],
    };
  }

  return buildMetadataFromProgramme(programme);
};

const getAllProgrammeMetadata = async () => {
  const programmes = await db.programme.findMany({
    include: {
      resources: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return Object.fromEntries(
    programmes.map((programme) => [programme.id, buildMetadataFromProgramme(programme)]),
  );
};

const updateProgrammeMetadata = async (programmeId, patch) => {
  const programme = await db.programme.update({
    where: {
      id: programmeId,
    },
    data: {
      ...(patch.selfEnrollmentEnabled !== undefined
        ? { selfEnrollmentEnabled: !!patch.selfEnrollmentEnabled }
        : {}),
      ...(patch.spotlightTitle !== undefined
        ? { spotlightTitle: patch.spotlightTitle || "" }
        : {}),
      ...(patch.spotlightMessage !== undefined
        ? { spotlightMessage: patch.spotlightMessage || "" }
        : {}),
    },
    include: {
      resources: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (Array.isArray(patch.resources) || Array.isArray(patch.meetingLinks)) {
    await db.programmeResource.deleteMany({
      where: {
        programmeId,
      },
    });

    const nextResources = [
      ...(Array.isArray(patch.resources) ? patch.resources : []),
      ...(Array.isArray(patch.meetingLinks) ? patch.meetingLinks : []).map((item) => ({
        ...item,
        resourceType: "meeting_link",
      })),
    ];

    if (nextResources.length > 0) {
      await db.programmeResource.createMany({
        data: nextResources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          description: resource.description || null,
          resourceType:
            resource.resourceType === "meeting_link" ? "meeting_link" : "study_material",
          url: resource.url || null,
          fileUrl: resource.fileUrl || null,
          programmeId,
          createdAt: resource.createdAt ? new Date(resource.createdAt) : new Date(),
        })),
      });
    }
  }

  return getProgrammeMetadata(programme.id);
};

const removeProgrammeMetadata = async (programmeId) => {
  await db.programmeResource.deleteMany({
    where: {
      programmeId,
    },
  });
};

const withProgrammeMetadata = async (programme) => {
  const metadata = await getProgrammeMetadata(programme.id);
  return {
    ...programme,
    ...metadata,
  };
};

export {
  getAllProgrammeMetadata,
  getProgrammeMetadata,
  removeProgrammeMetadata,
  updateProgrammeMetadata,
  withProgrammeMetadata,
  withProgrammeMetadataSync,
};

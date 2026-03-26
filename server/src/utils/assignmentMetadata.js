const ASSIGNMENT_TYPE_CONFIG = {
  document: [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"],
  audio: [".mp3", ".wav", ".m4a", ".aac"],
  video: [".mp4", ".mov", ".avi", ".mkv"],
  quiz: [".pdf", ".doc", ".docx", ".txt"],
  archive: [".zip", ".rar", ".7z"],
  interactive_session: [],
  link_submission: [".pdf", ".doc", ".docx", ".txt"],
};

const DEFAULT_ASSIGNMENT_TYPE = "document";
const METADATA_PREFIX = "[[vahani-meta:";
const METADATA_SUFFIX = "]]";

const getAcceptedFileTypesForAssignmentType = (assignmentType) => {
  return (
    ASSIGNMENT_TYPE_CONFIG[assignmentType] ||
    ASSIGNMENT_TYPE_CONFIG[DEFAULT_ASSIGNMENT_TYPE]
  );
};

const buildAssignmentDescription = (description, assignmentType) => {
  const metadata = JSON.stringify({
    assignmentType:
      assignmentType && ASSIGNMENT_TYPE_CONFIG[assignmentType]
        ? assignmentType
        : DEFAULT_ASSIGNMENT_TYPE,
  });

  return `${METADATA_PREFIX}${metadata}${METADATA_SUFFIX}${description || ""}`;
};

const parseAssignmentDescription = (rawDescription) => {
  if (!rawDescription?.startsWith(METADATA_PREFIX)) {
    return {
      description: rawDescription || "",
      assignmentType: DEFAULT_ASSIGNMENT_TYPE,
      acceptedFileTypes: getAcceptedFileTypesForAssignmentType(
        DEFAULT_ASSIGNMENT_TYPE,
      ),
    };
  }

  const suffixIndex = rawDescription.indexOf(METADATA_SUFFIX);

  if (suffixIndex === -1) {
    return {
      description: rawDescription || "",
      assignmentType: DEFAULT_ASSIGNMENT_TYPE,
      acceptedFileTypes: getAcceptedFileTypesForAssignmentType(
        DEFAULT_ASSIGNMENT_TYPE,
      ),
    };
  }

  try {
    const metadata = JSON.parse(
      rawDescription.slice(METADATA_PREFIX.length, suffixIndex),
    );
    const assignmentType =
      metadata?.assignmentType &&
      ASSIGNMENT_TYPE_CONFIG[metadata.assignmentType]
        ? metadata.assignmentType
        : DEFAULT_ASSIGNMENT_TYPE;

    return {
      description: rawDescription.slice(suffixIndex + METADATA_SUFFIX.length),
      assignmentType,
      acceptedFileTypes: getAcceptedFileTypesForAssignmentType(assignmentType),
    };
  } catch {
    return {
      description: rawDescription || "",
      assignmentType: DEFAULT_ASSIGNMENT_TYPE,
      acceptedFileTypes: getAcceptedFileTypesForAssignmentType(
        DEFAULT_ASSIGNMENT_TYPE,
      ),
    };
  }
};

const serializeAssignment = (assignment) => {
  const parsed = parseAssignmentDescription(assignment.description);
  const assignmentType =
    assignment.type && ASSIGNMENT_TYPE_CONFIG[assignment.type]
      ? assignment.type
      : parsed.assignmentType;
  const acceptedFileTypes =
    Array.isArray(assignment.acceptedFileTypes) &&
    assignment.acceptedFileTypes.length > 0
      ? assignment.acceptedFileTypes
      : getAcceptedFileTypesForAssignmentType(assignmentType);

  return {
    ...assignment,
    description: parsed.description,
    assignmentType,
    acceptedFileTypes,
  };
};

export {
  ASSIGNMENT_TYPE_CONFIG,
  DEFAULT_ASSIGNMENT_TYPE,
  buildAssignmentDescription,
  getAcceptedFileTypesForAssignmentType,
  parseAssignmentDescription,
  serializeAssignment,
};

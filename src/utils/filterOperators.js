// Filter operator constants for column filters (string, date, number)
// Used by PaginatedTable to show operator dropdowns per filter type

// String operators (for text columns)
export const STRING_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Does not contain" },
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Does not equal" },
  { value: "startsWith", label: "Begins with" },
  { value: "endsWith", label: "Ends with" },
];

// Date operators
export const DATE_OPERATORS = [
  { value: "inRange", label: "In range" },
  { value: "equals", label: "Equals" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
];

// Number operators
export const NUMBER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Does not equal" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
  { value: "between", label: "Between" },
];

export const getOperatorsForFilterType = (filterType) => {
  switch (filterType) {
    case "text":
      return STRING_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    case "number":
      return NUMBER_OPERATORS;
    default:
      return STRING_OPERATORS;
  }
};

export const getDefaultOperator = (filterType) => {
  switch (filterType) {
    case "text":
      return "contains";
    case "date":
      return "inRange";
    case "number":
      return "equals";
    default:
      return "contains";
  }
};

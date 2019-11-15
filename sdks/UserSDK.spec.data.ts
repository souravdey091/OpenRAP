const DEFAULT_USER = 'guest'

const userCreateWithDefaultName = {
  framework: {
  board: 'English',
  medium: ['English'],
  gradeLevel: ['Class 5']
}};

const userCreateWithName1 = {
  _id: "anoop",
  data: {
  name: "Anoop",
  framework: {
  board: 'English',
  medium: ['English'],
  gradeLevel: ['Class 5']
}}};

const userCreateWithName2 = {
  _id: "anoophm",
  data: {
  name: "Anoop HM",
  framework: {
  board: 'English',
  medium: ['English'],
  gradeLevel: ['Class 5']
}}};

const userCreateWithName3 = {
  _id: "anuphm",
  data: {
  name: "  Anup HM ",
  framework: {
  board: 'English',
  medium: ['English'],
  gradeLevel: ['Class 5']
}}};

const createError = {
  code: "UPDATE_CONFLICT",
  status: 409,
  message: `Document already exist with id`
}

const readError = {
  code: "DOC_NOT_FOUND",
  status: 404,
  message: `Document not found with id`
}

export {
  userCreateWithDefaultName,
  userCreateWithName1,
  userCreateWithName2,
  userCreateWithName3,
  createError,
  readError,
  DEFAULT_USER
}
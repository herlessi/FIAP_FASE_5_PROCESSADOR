/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverage: true,
  collectCoverageFrom: [
    "src/domain/usecases/create-frames-use-case.ts",
    "src/domain/usecases/download-videos-use-case.ts",
    "src/infra/controllers/ProcessadorController.ts",
    "src/infra/gateways/message-queue/rabbitmq.ts",
    "src/infra/gateways/repository-files/s3-bucket-repo.ts",
    "src/infra/observability/metrics.ts",
  ],
  coverageThreshold: {
    global: {
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

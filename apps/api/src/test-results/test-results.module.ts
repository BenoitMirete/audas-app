import { Module } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { TestResultsController } from './test-results.controller';

@Module({
  providers: [TestResultsService],
  controllers: [TestResultsController],
  exports: [TestResultsService],
})
export class TestResultsModule {}

import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, ValidateIf, Max, MaxLength, Min, MinLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsString() @MinLength(1) @MaxLength(200)
  title!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @ValidateIf((_o, value) => value !== undefined) @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ValidateIf((_o, value) => value !== undefined) @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsString()
  assigneeId?: string;
}

export class UpdateTaskDto {
  @ValidateIf((_o, value) => value !== undefined) @IsString() @MinLength(1) @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @ValidateIf((_o, value) => value !== undefined) @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ValidateIf((_o, value) => value !== undefined) @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional() @IsDateString()
  dueDate?: string | null;

  @IsOptional() @IsString()
  assigneeId?: string | null;
}

export class AddCommentDto {
  @IsString() @MinLength(1) @MaxLength(2000)
  content!: string;
}

export class TaskQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;

  @ValidateIf((_o, value) => value !== undefined) @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional() @IsString()
  assigneeId?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsIn(['priority', 'dueDate', 'createdAt'])
  sortBy: 'priority' | 'dueDate' | 'createdAt' = 'createdAt';

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

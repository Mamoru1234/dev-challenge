import { INestApplication, ValidationPipe } from '@nestjs/common';

export function enableValidation(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
        excludeExtraneousValues: true,
      },
    }),
  );
}

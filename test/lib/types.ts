export interface ServerLessFunctionAPIEvent {
  Type: 'Api' | 'HttpApi';
  Properties: {
    Path: string;
    Method: string;
    TimeoutInMillis: number;
    PayloadFormatVersion: '1.0' | '2.0';
  };
}

export interface ServerLessFunction {
  Type: 'AWS::Serverless::Function';
  Properties: {
    Handler: string;
    Runtime: 'nodejs12.x';
    MemorySize: number;
    Timeout: number;
    Description?: string;
    Events?: Record<'Api', ServerLessFunctionAPIEvent>;
  };
}

export interface SAMTemplate {
  AWSTemplateFormatVersion: string;
  Transform: string[];
  Resources: Record<string, ServerLessFunction>;
  Outputs?: {
    WebEndpoint: {
      Value: string;
    };
  };
}

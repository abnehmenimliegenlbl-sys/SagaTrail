#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SagaTrailCompanion, RCTEventEmitter)
RCT_EXTERN_METHOD(activate)
RCT_EXTERN_METHOD(drainPendingWatchActions)
RCT_EXTERN_METHOD(selectGarminDevice)
RCT_EXTERN_METHOD(publishLiveState:(NSDictionary *)state)
RCT_EXTERN_METHOD(updateHikeLiveState:(NSDictionary *)state)
RCT_EXTERN_METHOD(sendAlert:(NSDictionary *)alert)
RCT_EXTERN_METHOD(getStatus:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getLatestHeartRate:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
@end
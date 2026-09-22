t function useGetMeetupPhotos<TData = Awaited<ReturnType<typeof getMeetupPhotos>>, TError = ErrorType<void>>(
 id: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getMeetupPhotos>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetMeetupPhotosQueryOptions(id,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getUpdateMeetupPhotoConsentUrl = (id: string,) => {




  return `/api/meetups/${id}/photo-consent`
}

/**
 * @summary Freigabe für eine Namensnennung aktualisieren
 */
export const updateMeetupPhotoConsent = async (id: string,
    updateMeetupPhotoConsentBody: UpdateMeetupPhotoConsentBody, options?: RequestInit): Promise<UpdateMeetupPhotoConsent200> => {

  return customFetch<UpdateMeetupPhotoConsent200>(getUpdateMeetupPhotoConsentUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(updateMeetupPhotoConsentBody)
  }
);}




export const getUpdateMeetupPhotoConsentMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMeetupPhotoConsent>>, TError,{id: string;data: BodyType<UpdateMeetupPhotoConsentBody>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateMeetupPhotoConsent>>, TError,{id: string;data: BodyType<UpdateMeetupPhotoConsentBody>}, TContext> => {

const mutationKey = ['updateMeetupPhotoConsent'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateMeetupPhotoConsent>>, {id: string;data: BodyType<UpdateMeetupPhotoConsentBody>}> = (props) => {
          const {id,data} = props ?? {};

          return  updateMeetupPhotoConsent(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateMeetupPhotoConsentMutationResult = NonNullable<Awaited<ReturnType<typeof updateMeetupPhotoConsent>>>
    export type UpdateMeetupPhotoConsentMutationBody = BodyType<UpdateMeetupPhotoConsentBody>
    export type UpdateMeetupPhotoConsentMutationError = ErrorType<void>

    /**
 * @summary Freigabe für eine Namensnennung aktualisieren
 */
export const useUpdateMeetupPhotoConsent = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMeetupPhotoConsent>>, TError,{id: string;data: BodyType<UpdateMeetupPhotoConsentBody>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateMeetupPhotoConsent>>,
        TError,
        {id: string;data: BodyType<UpdateMeetupPhotoConsentBody>},
        TContext
      > => {
      return useMutation(getUpdateMeetupPhotoConsentMutationOptions(options));
    }

export const getUploadMeetupPhotoUrl = (id: string,
    params: UploadMeetupPhotoParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/meetups/${id}/photos/upload?${stringifiedParams}` : `/api/meetups/${id}/photos/upload`
}

/**
 * @summary Privates Foto nach zwei getrennten Einwilligungen hochladen
 */
export const uploadMeetupPhoto = async (id: string,
    uploadMeetupPhotoBody: Blob,
    params: UploadMeetupPhotoParams, options?: RequestInit): Promise<UploadMeetupPhoto201> => {

  return customFetch<UploadMeetupPhoto201>(getUploadMeetupPhotoUrl(id,params),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', ...options?.headers },
    body: uploadMeetupPhotoBody
  }
);}




export const getUploadMeetupPhotoMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof uploadMeetupPhoto>>, TError,{id: string;data: BodyType<Blob>;params: UploadMeetupPhotoParams}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof uploadMeetupPhoto>>, TError,{id: string;data: BodyType<Blob>;params: UploadMeetupPhotoParams}, TContext> => {

const mutationKey = ['uploadMeetupPhoto'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof uploadMeetupPhoto>>, {id: string;data: BodyType<Blob>;params: UploadMeetupPhotoParams}> = (props) => {
          const {id,data,params} = props ?? {};

          return  uploadMeetupPhoto(id,data,params,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UploadMeetupPhotoMutationResult = NonNullable<Awaited<ReturnType<typeof uploadMeetupPhoto>>>
    export type UploadMeetupPhotoMutationBody = BodyType<Blob>
    export type UploadMeetupPhotoMutationError = ErrorType<void>

    /**
 * @summary Privates Foto nach zwei getrennten Einwilligungen hochladen
 */
export const useUploadMeetupPhoto = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof uploadMeetupPhoto>>, TError,{id: string;data: BodyType<Blob>;params: UploadMeetupPhotoParams}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof uploadMeetupPhoto>>,
        TError,
        {id: string;data: BodyType<Blob>;params: UploadMeetupPhotoParams},
        TContext
      > => {
      return useMutation(getUploadMeetupPhotoMutationOptions(options));
    }

export const getDeleteMeetupPhotoUrl = (id: string,
    photoId: string,) => {




  return `/api/meetups/${id}/photos/${photoId}`
}

/**
 * @summary Eigenes Meetup-Foto löschen
 */
export const deleteMeetupPhoto = async (id: string,
    photoId: string, options?: RequestInit): Promise<DeleteMeetupPhoto200> => {

  return customFetch<DeleteMeetupPhoto200>(getDeleteMeetupPhotoUrl(id,photoId),
  {
    ...options,
    method: 'DELETE'


  }
);}




export const getDeleteMeetupPhotoMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteMeetupPhoto>>, TError,{id: string;photoId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof deleteMeetupPhoto>>, TError,{id: string;photoId: string}, TContext> => {

const mutationKey = ['deleteMeetupPhoto'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteMeetupPhoto>>, {id: string;photoId: string}> = (props) => {
          const {id,photoId} = props ?? {};

          return  deleteMeetupPhoto(id,photoId,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type DeleteMeetupPhotoMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMeetupPhoto>>>

    export type DeleteMeetupPhotoMutationError = ErrorType<void>

    /**
 * @summary Eigenes Meetup-Foto löschen
 */
export const useDeleteMeetupPhoto = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteMeetupPhoto>>, TError,{id: string;photoId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof deleteMeetupPhoto>>,
        TError,
        {id: string;photoId: string},
        TContext
      > => {
      return useMutation(getDeleteMeetupPhotoMutationOptions(options));
    }

export const getPrepareMeetupPhotoShareUrl = (id: string,) => {




  return `/api/meetups/${id}/photos/share`
}

/**
 * @summary Organizer-Beitrag mit Auswahl und Namensfreigaben vorbereiten
 */
export const prepareMeetupPhotoShare = async (id: string,
    prepareMeetupPhotoShareBody: PrepareMeetupPhotoShareBody, options?: RequestInit): Promise<PrepareMeetupPhotoShare200> => {

  return customFetch<PrepareMeetupPhotoShare200>(getPrepareMeetupPhotoShareUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(prepareMeetupPhotoShareBody)
  }
);}




export const getPrepareMeetupPhotoShareMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof prepareMeetupPhotoShare>>, TError,{id: string;data: BodyType<PrepareMeetupPhotoShareBody>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof prepareMeetupPhotoShare>>, TError,{id: string;data: BodyType<PrepareMeetupPhotoShareBody>}, TContext> => {

const mutationKey = ['prepareMeetupPhotoShare'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof prepareMeetupPhotoShare>>, {id: string;data: BodyType<PrepareMeetupPhotoShareBody>}> = (props) => {
          const {id,data} = props ?? {};

          return  prepareMeetupPhotoShare(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrepareMeetupPhotoShareMutationResult = NonNullable<Awaited<ReturnType<typeof prepareMeetupPhotoShare>>>
    export type PrepareMeetupPhotoShareMutationBody = BodyType<PrepareMeetupPhotoShareBody>
    export type PrepareMeetupPhotoShareMutationError = ErrorType<void>

    /**
 * @summary Organizer-Beitrag mit Auswahl und Namensfreigaben vorbereiten
 */
export const usePrepareMeetupPhotoShare = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof prepareMeetupPhotoShare>>, TError,{id: string;data: BodyType<PrepareMeetupPhotoShareBody>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof prepareMeetupPhotoShare>>,
        TError,
        {id: string;data: BodyType<PrepareMeetupPhotoShareBody>},
        TContext
      > => {
      return useMutation(getPrepareMeetupPhotoShareMutationOptions(options));
    }

export const getCancelMeetupUrl = (id: string,) => {




  return `/api/meetups/${id}/cancel`
}

/**
 * @summary Eigenen Treffpunkt absagen
 */
export const cancelMeetup = async (id: string,
    cancelMeetupRequest: CancelMeetupRequest, options?: RequestInit): Promise<void> => {

  return customFetch<void>(getCancelMeetupUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(cancelMeetupRequest)
  }
);}




export const getCancelMeetupMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof cancelMeetup>>, TError,{id: string;data: BodyType<CancelMeetupRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof cancelMeetup>>, TError,{id: string;data: BodyType<CancelMeetupRequest>}, TContext> => {

const mutationKey = ['cancelMeetup'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof cancelMeetup>>, {id: string;data: BodyType<CancelMeetupRequest>}> = (props) => {
          const {id,data} = props ?? {};

          return  cancelMeetup(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type CancelMeetupMutationResult = NonNullable<Awaited<ReturnType<typeof cancelMeetup>>>
    export type CancelMeetupMutationBody = BodyType<CancelMeetupRequest>
    export type CancelMeetupMutationError = ErrorType<void>

    /**
 * @summary Eigenen Treffpunkt absagen
 */
export const useCancelMeetup = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof cancelMeetup>>, TError,{id: string;data: BodyType<CancelMeetupRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof cancelMeetup>>,
        TError,
        {id: string;data: BodyType<CancelMeetupRequest>},
        TContext
      > => {
      return useMutation(getCancelMeetupMutationOptions(options));
    }

export const getStartMeetupUrl = (id: string,) => {




  return `/api/meetups/${id}/start`
}

/**
 * @summary Treffpunkt starten
 */
export const startMeetup = async (id: string, options?: RequestInit): Promise<MeetupLifecycleResponse> => {

  return customFetch<MeetupLifecycleResponse>(getStartMeetupUrl(id),
  {
    ...options,
    method: 'POST'


  }
);}




export const getStartMeetupMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof startMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof startMeetup>>, TError,{id: string}, TContext> => {

const mutationKey = ['startMeetup'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof startMeetup>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  startMeetup(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type StartMeetupMutationResult = NonNullable<Awaited<ReturnType<typeof startMeetup>>>

    export type StartMeetupMutationError = ErrorType<void>

    /**
 * @summary Treffpunkt starten
 */
export const useStartMeetup = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof startMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof startMeetup>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getStartMeetupMutationOptions(options));
    }

export const getCompleteMeetupUrl = (id: string,) => {




  return `/api/meetups/${id}/complete`
}

/**
 * @summary Treffpunkt abschliessen
 */
export const completeMeetup = async (id: string, options?: RequestInit): Promise<MeetupLifecycleResponse> => {

  return customFetch<MeetupLifecycleResponse>(getCompleteMeetupUrl(id),
  {
    ...options,
    method: 'POST'


  }
);}




export const getCompleteMeetupMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof completeMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof completeMeetup>>, TError,{id: string}, TContext> => {

const mutationKey = ['completeMeetup'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof completeMeetup>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  completeMeetup(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type CompleteMeetupMutationResult = NonNullable<Awaited<ReturnType<typeof completeMeetup>>>

    export type CompleteMeetupMutationError = ErrorType<void>

    /**
 * @summary Treffpunkt abschliessen
 */
export const useCompleteMeetup = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof completeMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof completeMeetup>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getCompleteMeetupMutationOptions(options));
    }

export const getSendMeetupMessageUrl = (id: string,) => {




  return `/api/meetups/${id}/messages`
}

/**
 * @summary Nachricht an Treffpunktteilnehmer senden
 */
export const sendMeetupMessage = async (id: string,
    meetupMessageRequest: MeetupMessageRequest, options?: RequestInit): Promise<MeetupMessageResponse> => {

  return customFetch<MeetupMessageResponse>(getSendMeetupMessageUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(meetupMessageRequest)
  }
);}




export const getSendMeetupMessageMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof sendMeetupMessage>>, TError,{id: string;data: BodyType<MeetupMessageRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof sendMeetupMessage>>, TError,{id: string;data: BodyType<MeetupMessageRequest>}, TContext> => {

const mutationKey = ['sendMeetupMessage'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof sendMeetupMessage>>, {id: string;data: BodyType<MeetupMessageRequest>}> = (props) => {
          const {id,data} = props ?? {};

          return  sendMeetupMessage(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type SendMeetupMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMeetupMessage>>>
    export type SendMeetupMessageMutationBody = BodyType<MeetupMessageRequest>
    export type SendMeetupMessageMutationError = ErrorType<void>

    /**
 * @summary Nachricht an Treffpunktteilnehmer senden
 */
export const useSendMeetupMessage = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof sendMeetupMessage>>, TError,{id: string;data: BodyType<MeetupMessageRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof sendMeetupMessage>>,
        TError,
        {id: string;data: BodyType<MeetupMessageRequest>},
        TContext
      > => {
      return useMutation(getSendMeetupMessageMutationOptions(options));
    }

export const getJoinMeetupUrl = (id: string,) => {




  return `/api/meetups/${id}/join`
}

/**
 * @summary Bei einem Treffpunkt mitwandern
 */
export const joinMeetup = async (id: string, options?: RequestInit): Promise<MeetupJoinResponse> => {

  return customFetch<MeetupJoinResponse>(getJoinMeetupUrl(id),
  {
    ...options,
    method: 'POST'


  }
);}




export const getJoinMeetupMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof joinMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof joinMeetup>>, TError,{id: string}, TContext> => {

const mutationKey = ['joinMeetup'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof joinMeetup>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  joinMeetup(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type JoinMeetupMutationResult = NonNullable<Awaited<ReturnType<typeof joinMeetup>>>

    export type JoinMeetupMutationError = ErrorType<void>

    /**
 * @summary Bei einem Treffpunkt mitwandern
 */
export const useJoinMeetup = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof joinMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof joinMeetup>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getJoinMeetupMutationOptions(options));
    }

export const getLeaveMeetupUrl = (id: string,) => {




  return `/api/meetups/${id}/join`
}

/**
 * @summary Teilnahme an einem Treffpunkt aufheben
 */
export const leaveMeetup = async (id: string, options?: RequestInit): Promise<MeetupJoinResponse> => {

  return customFetch<MeetupJoinResponse>(getLeaveMeetupUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
);}




export const getLeaveMeetupMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof leaveMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof leaveMeetup>>, TError,{id: string}, TContext> => {

const mutationKey = ['leaveMeetup'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof leaveMeetup>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  leaveMeetup(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type LeaveMeetupMutationResult = NonNullable<Awaited<ReturnType<typeof leaveMeetup>>>

    export type LeaveMeetupMutationError = ErrorType<void>

    /**
 * @summary Teilnahme an einem Treffpunkt aufheben
 */
export const useLeaveMeetup = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof leaveMeetup>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof leaveMeetup>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getLeaveMeetupMutationOptions(options));
    }

export const getUpdateMeetupAttendanceUrl = (id: string,) => {




  return `/api/meetups/${id}/attendance`
}

/**
 * @summary Eigenen Anwesenheitsstatus aktualisieren
 */
export const updateMeetupAttendance = async (id: string,
    meetupAttendanceRequest: MeetupAttendanceRequest, options?: RequestInit): Promise<MeetupAttendanceResponse> => {

  return customFetch<MeetupAttendanceResponse>(getUpdateMeetupAttendanceUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(meetupAttendanceRequest)
  }
);}




export const getUpdateMeetupAttendanceMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMeetupAttendance>>, TError,{id: string;data: BodyType<MeetupAttendanceRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateMeetupAttendance>>, TError,{id: string;data: BodyType<MeetupAttendanceRequest>}, TContext> => {

const mutationKey = ['updateMeetupAttendance'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateMeetupAttendance>>, {id: string;data: BodyType<MeetupAttendanceRequest>}> = (props) => {
          const {id,data} = props ?? {};

          return  updateMeetupAttendance(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateMeetupAttendanceMutationResult = NonNullable<Awaited<ReturnType<typeof updateMeetupAttendance>>>
    export type UpdateMeetupAttendanceMutationBody = BodyType<MeetupAttendanceRequest>
    export type UpdateMeetupAttendanceMutationError = ErrorType<void>

    /**
 * @summary Eigenen Anwesenheitsstatus aktualisieren
 */
export const useUpdateMeetupAttendance = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateMeetupAttendance>>, TError,{id: string;data: BodyType<MeetupAttendanceRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateMeetupAttendance>>,
        TError,
        {id: string;data: BodyType<MeetupAttendanceRequest>},
        TContext
      > => {
      return useMutation(getUpdateMeetupAttendanceMutationOptions(options));
    }

export const getCreateMeetupShareUrl = (id: string,) => {




  return `/api/meetups/${id}/share`
}

/**
 * @summary Sicheren Treffpunkt-Link erstellen
 */
export const createMeetupShare = async (id: string, options?: RequestInit): Promise<MeetupShareResponse> => {

  return customFetch<MeetupShareResponse>(getCreateMeetupShareUrl(id),
  {
    ...options,
    method: 'POST'


  }
);}




export const getCreateMeetupShareMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createMeetupShare>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof createMeetupShare>>, TError,{id: string}, TContext> => {

const mutationKey = ['createMeetupShare'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof createMeetupShare>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  createMeetupShare(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type CreateMeetupShareMutationResult = NonNullable<Awaited<ReturnType<typeof createMeetupShare>>>

    export type CreateMeetupShareMutationError = ErrorType<void>

    /**
 * @summary Sicheren Treffpunkt-Link erstellen
 */
export const useCreateMeetupShare = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createMeetupShare>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof createMeetupShare>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getCreateMeetupShareMutationOptions(options));
    }

export const getGetSharedMeetupUrl = (token: string,) => {




  return `/api/meetups/shared/${token}`
}

/**
 * @summary Öffentlichen Treffpunkt-Link laden
 */
export const getSharedMeetup = async (token: string, options?: RequestInit): Promise<SharedMeetup> => {

  return customFetch<SharedMeetup>(getGetSharedMeetupUrl(token),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetSharedMeetupQueryKey = (token: string,) => {
    return [
    `/api/meetups/shared/${token}`
    ] as const;
    }


export const getGetSharedMeetupQueryOptions = <TData = Awaited<ReturnType<typeof getSharedMeetup>>, TError = ErrorType<void>>(token: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getSharedMeetup>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetSharedMeetupQueryKey(token);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getSharedMeetup>>> = ({ signal }) => getSharedMeetup(token, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: token !== null && token !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getSharedMeetup>>, TError, TData> & { queryKey: QueryKey }
}

export type GetSharedMeetupQueryResult = NonNullable<Awaited<ReturnType<typeof getSharedMeetup>>>
export type GetSharedMeetupQueryError = ErrorType<void>


/**
 * @summary Öffentlichen Treffpunkt-Link laden
 */

export function useGetSharedMeetup<TData = Awaited<ReturnType<typeof getSharedMeetup>>, TError = ErrorType<void>>(
 token: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getSharedMeetup>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetSharedMeetupQueryOptions(token,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getReportMeetupUrl = (id: string,) => {




  return `/api/meetups/${id}/report`
}

/**
 * @summary Treffpunkt oder Nutzer melden
 */
export const reportMeetup = async (id: string,
    meetupReportRequest: MeetupReportRequest, options?: RequestInit): Promise<MeetupActionResponse> => {

  return customFetch<MeetupActionResponse>(getReportMeetupUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(meetupReportRequest)
  }
);}




export const getReportMeetupMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof reportMeetup>>, TError,{id: string;data: BodyType<MeetupReportRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof reportMeetup>>, TError,{id: string;data: BodyType<MeetupReportRequest>}, TContext> => {

const mutationKey = ['reportMeetup'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof reportMeetup>>, {id: string;data: BodyType<MeetupReportRequest>}> = (props) => {
          const {id,data} = props ?? {};

          return  reportMeetup(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type ReportMeetupMutationResult = NonNullable<Awaited<ReturnType<typeof reportMeetup>>>
    export type ReportMeetupMutationBody = BodyType<MeetupReportRequest>
    export type ReportMeetupMutationError = ErrorType<void>

    /**
 * @summary Treffpunkt oder Nutzer melden
 */
export const useReportMeetup = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof reportMeetup>>, TError,{id: string;data: BodyType<MeetupReportRequest>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof reportMeetup>>,
        TError,
        {id: string;data: BodyType<MeetupReportRequest>},
        TContext
      > => {
      return useMutation(getReportMeetupMutationOptions(options));
    }

export const getBlockMeetupOrganizerUrl = (id: string,) => {




  return `/api/meetups/${id}/block-organizer`
}

/**
 * @summary Organisator eines Treffpunkts blockieren
 */
export const blockMeetupOrganizer = async (id: string, options?: RequestInit): Promise<MeetupActionResponse> => {

  return customFetch<MeetupActionResponse>(getBlockMeetupOrganizerUrl(id),
  {
    ...options,
    method: 'POST'


  }
);}




export const getBlockMeetupOrganizerMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof blockMeetupOrganizer>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof blockMeetupOrganizer>>, TError,{id: string}, TContext> => {

const mutationKey = ['blockMeetupOrganizer'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof blockMeetupOrganizer>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  blockMeetupOrganizer(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type BlockMeetupOrganizerMutationResult = NonNullable<Awaited<ReturnType<typeof blockMeetupOrganizer>>>

    export type BlockMeetupOrganizerMutationError = ErrorType<void>

    /**
 * @summary Organisator eines Treffpunkts blockieren
 */
export const useBlockMeetupOrganizer = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof blockMeetupOrganizer>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof blockMeetupOrganizer>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getBlockMeetupOrganizerMutationOptions(options));
    }

export const getBlockMeetupUserUrl = (userId: string,) => {




  return `/api/meetups/users/${userId}/block`
}

/**
 * @summary Nutzer für Treffpunkte blockieren
 */
export const blockMeetupUser = async (userId: string, options?: RequestInit): Promise<MeetupActionResponse> => {

  return customFetch<MeetupActionResponse>(getBlockMeetupUserUrl(userId),
  {
    ...options,
    method: 'POST'


  }
);}




export const getBlockMeetupUserMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof blockMeetupUser>>, TError,{userId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof blockMeetupUser>>, TError,{userId: string}, TContext> => {

const mutationKey = ['blockMeetupUser'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof blockMeetupUser>>, {userId: string}> = (props) => {
          const {userId} = props ?? {};

          return  blockMeetupUser(userId,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type BlockMeetupUserMutationResult = NonNullable<Awaited<ReturnType<typeof blockMeetupUser>>>

    export type BlockMeetupUserMutationError = ErrorType<void>

    /**
 * @summary Nutzer für Treffpunkte blockieren
 */
export const useBlockMeetupUser = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof blockMeetupUser>>, TError,{userId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof blockMeetupUser>>,
        TError,
        {userId: string},
        TContext
      > => {
      return useMutation(getBlockMeetupUserMutationOptions(options));
    }

export const getUnblockMeetupUserUrl = (userId: string,) => {




  return `/api/meetups/users/${userId}/block`
}

/**
 * @summary Nutzerblockierung aufheben
 */
export const unblockMeetupUser = async (userId: string, options?: RequestInit): Promise<MeetupActionResponse> => {

  return customFetch<MeetupActionResponse>(getUnblockMeetupUserUrl(userId),
  {
    ...options,
    method: 'DELETE'


  }
);}




export const getUnblockMeetupUserMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof unblockMeetupUser>>, TError,{userId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof unblockMeetupUser>>, TError,{userId: string}, TContext> => {

const mutationKey = ['unblockMeetupUser'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof unblockMeetupUser>>, {userId: string}> = (props) => {
          const {userId} = props ?? {};

          return  unblockMeetupUser(userId,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UnblockMeetupUserMutationResult = NonNullable<Awaited<ReturnType<typeof unblockMeetupUser>>>

    export type UnblockMeetupUserMutationError = ErrorType<void>

    /**
 * @summary Nutzerblockierung aufheben
 */
export const useUnblockMeetupUser = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof unblockMeetupUser>>, TError,{userId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof unblockMeetupUser>>,
        TError,
        {userId: string},
        TContext
      > => {
      return useMutation(getUnblockMeetupUserMutationOptions(options));
    }

export const getRemoveMeetupParticipantUrl = (id: string,
    userId: string,) => {




  return `/api/meetups/${id}/participants/${userId}`
}

/**
 * @summary Teilnehmer als Organisator entfernen
 */
export const removeMeetupParticipant = async (id: string,
    userId: string, options?: RequestInit): Promise<void> => {

  return customFetch<void>(getRemoveMeetupParticipantUrl(id,userId),
  {
    ...options,
    method: 'DELETE'


  }
);}




export const getRemoveMeetupParticipantMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof removeMeetupParticipant>>, TError,{id: string;userId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof removeMeetupParticipant>>, TError,{id: string;userId: string}, TContext> => {

const mutationKey = ['removeMeetupParticipant'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof removeMeetupParticipant>>, {id: string;userId: string}> = (props) => {
          const {id,userId} = props ?? {};

          return  removeMeetupParticipant(id,userId,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type RemoveMeetupParticipantMutationResult = NonNullable<Awaited<ReturnType<typeof removeMeetupParticipant>>>

    export type RemoveMeetupParticipantMutationError = ErrorType<void>

    /**
 * @summary Teilnehmer als Organisator entfernen
 */
export const useRemoveMeetupParticipant = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof removeMeetupParticipant>>, TError,{id: string;userId: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof removeMeetupParticipant>>,
        TError,
        {id: string;userId: string},
        TContext
      > => {
      return useMutation(getRemoveMeetupParticipantMutationOptions(options));
    }

export const getGetCommunityInvitationUrl = (slug: string,) => {




  return `/api/communities/invitations/${slug}`
}

/**
 * Liefert die freigegebenen Informationen einer SagaTrail-Community für eine Landingpage. Die Antwort enthält keinen privaten Kontostand und keine Mitgliederliste.
 * @summary Öffentliche Community-Einladung laden
 */
export const getCommunityInvitation = async (slug: string, options?: RequestInit): Promise<CommunityInvitation> => {

  return customFetch<CommunityInvitation>(getGetCommunityInvitationUrl(slug),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetCommunityInvitationQueryKey = (slug: string,) => {
    return [
    `/api/communities/invitations/${slug}`
    ] as const;
    }


export const getGetCommunityInvitationQueryOptions = <TData = Awaited<ReturnType<typeof getCommunityInvitation>>, TError = ErrorType<ErrorResponse>>(slug: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getCommunityInvitation>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetCommunityInvitationQueryKey(slug);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getCommunityInvitation>>> = ({ signal }) => getCommunityInvitation(slug, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: slug !== null && slug !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getCommunityInvitation>>, TError, TData> & { queryKey: QueryKey }
}

export type GetCommunityInvitationQueryResult = NonNullable<Awaited<ReturnType<typeof getCommunityInvitation>>>
export type GetCommunityInvitationQueryError = ErrorType<ErrorResponse>


/**
 * @summary Öffentliche Community-Einladung laden
 */

export function useGetCommunityInvitation<TData = Awaited<ReturnType<typeof getCommunityInvitation>>, TError = ErrorType<ErrorResponse>>(
 slug: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getCommunityInvitation>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetCommunityInvitationQueryOptions(slug,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetMyCommunitiesUrl = () => {




  return `/api/communities/me`
}

/**
 * Liefert die aktiven Communities, denen der eingeloggte Nutzer angehört. Die Reihenfolge ist alphabetisch nach dem Community-Namen.
 * @summary Eigene aktive Communities laden
 */
export const getMyCommunities = async ( options?: RequestInit): Promise<CommunitySummary[]> => {

  return customFetch<CommunitySummary[]>(getGetMyCommunitiesUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetMyCommunitiesQueryKey = () => {
    return [
    `/api/communities/me`
    ] as const;
    }


export const getGetMyCommunitiesQueryOptions = <TData = Awaited<ReturnType<typeof getMyCommunities>>, TError = ErrorType<void>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getMyCommunities>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetMyCommunitiesQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getMyCommunities>>> = ({ signal }) => getMyCommunities({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getMyCommunities>>, TError, TData> & { queryKey: QueryKey }
}

export type GetMyCommunitiesQueryResult = NonNullable<Awaited<ReturnType<typeof getMyCommunities>>>
export type GetMyCommunitiesQueryError = ErrorType<void>


/**
 * @summary Eigene aktive Communities laden
 */

export function useGetMyCommunities<TData = Awaited<ReturnType<typeof getMyCommunities>>, TError = ErrorType<void>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getMyCommunities>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetMyCommunitiesQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getLeaveCommunityUrl = (id: string,) => {




  return `/api/communities/${id}/membership`
}

/**
 * @summary Eigene Community-Mitgliedschaft beenden
 */
export const leaveCommunity = async (id: string, options?: RequestInit): Promise<void> => {

  return customFetch<void>(getLeaveCommunityUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
);}




export const getLeaveCommunityMutationOptions = <TError = ErrorType<void | ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof leaveCommunity>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof leaveCommunity>>, TError,{id: string}, TContext> => {

const mutationKey = ['leaveCommunity'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof leaveCommunity>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  leaveCommunity(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type LeaveCommunityMutationResult = NonNullable<Awaited<ReturnType<typeof leaveCommunity>>>

    export type LeaveCommunityMutationError = ErrorType<void | ErrorResponse>

    /**
 * @summary Eigene Community-Mitgliedschaft beenden
 */
export const useLeaveCommunity = <TError = ErrorType<void | ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof leaveCommunity>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof leaveCommunity>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getLeaveCommunityMutationOptions(options));
    }

export const getGetCommunityInvitationByCodeUrl = (code: string,) => {




  return `/api/communities/invitations/by-code/${code}`
}

/**
 * Löst einen kurzen Einladungscode auf. Der Code ist ein Fallback für Facebook-In-App-Browser und Store-Weiterleitungen.
 * @summary Community-Einladung über den Fallback-Code laden
 */
export const getCommunityInvitationByCode = async (code: string, options?: RequestInit): Promise<CommunityInvitation> => {

  return customFetch<CommunityInvitation>(getGetCommunityInvitationByCodeUrl(code),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetCommunityInvitationByCodeQueryKey = (code: string,) => {
    return [
    `/api/communities/invitations/by-code/${code}`
    ] as const;
    }


export const getGetCommunityInvitationByCodeQueryOptions = <TData = Awaited<ReturnType<typeof getCommunityInvitationByCode>>, TError = ErrorType<ErrorResponse>>(code: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getCommunityInvitationByCode>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetCommunityInvitationByCodeQueryKey(code);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getCommunityInvitationByCode>>> = ({ signal }) => getCommunityInvitationByCode(code, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: code !== null && code !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getCommunityInvitationByCode>>, TError, TData> & { queryKey: QueryKey }
}

export type GetCommunityInvitationByCodeQueryResult = NonNullable<Awaited<ReturnType<typeof getCommunityInvitationByCode>>>
export type GetCommunityInvitationByCodeQueryError = ErrorType<ErrorResponse>


/**
 * @summary Community-Einladung über den Fallback-Code laden
 */

export function useGetCommunityInvitationByCode<TData = Awaited<ReturnType<typeof getCommunityInvitationByCode>>, TError = ErrorType<ErrorResponse>>(
 code: string, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getCommunityInvitationByCode>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetCommunityInvitationByCodeQueryOptions(code,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getClaimCommunityInvitationUrl = () => {




  return `/api/communities/invitations/claim`
}

/**
 * @summary Einer Community mit einem Einladungscode beitreten
 */
export const claimCommunityInvitation = async (communityClaimInput: CommunityClaimInput, options?: RequestInit): Promise<CommunityMembership> => {

  return customFetch<CommunityMembership>(getClaimCommunityInvitationUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(communityClaimInput)
  }
);}




export const getClaimCommunityInvitationMutationOptions = <TError = ErrorType<ErrorResponse | void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof claimCommunityInvitation>>, TError,{data: BodyType<CommunityClaimInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof claimCommunityInvitation>>, TError,{data: BodyType<CommunityClaimInput>}, TContext> => {

const mutationKey = ['claimCommunityInvitation'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof claimCommunityInvitation>>, {data: BodyType<CommunityClaimInput>}> = (props) => {
          const {data} = props ?? {};

          return  claimCommunityInvitation(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type ClaimCommunityInvitationMutationResult = NonNullable<Awaited<ReturnType<typeof claimCommunityInvitation>>>
    export type ClaimCommunityInvitationMutationBody = BodyType<CommunityClaimInput>
    export type ClaimCommunityInvitationMutationError = ErrorType<ErrorResponse | void>

    /**
 * @summary Einer Community mit einem Einladungscode beitreten
 */
export const useClaimCommunityInvitation = <TError = ErrorType<ErrorResponse | void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof claimCommunityInvitation>>, TError,{data: BodyType<CommunityClaimInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof claimCommunityInvitation>>,
        TError,
        {data: BodyType<CommunityClaimInput>},
        TContext
      > => {
      return useMutation(getClaimCommunityInvitationMutationOptions(options));
    }

export const getListCommunitiesUrl = () => {




  return `/api/admin/communities`
}

/**
 * @summary SagaTrail-Communities verwalten
 */
export const listCommunities = async ( options?: RequestInit): Promise<CommunityInvitation[]> => {

  return customFetch<CommunityInvitation[]>(getListCommunitiesUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListCommunitiesQueryKey = () => {
    return [
    `/api/admin/communities`
    ] as const;
    }


export const getListCommunitiesQueryOptions = <TData = Awaited<ReturnType<typeof listCommunities>>, TError = ErrorType<void>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listCommunities>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListCommunitiesQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listCommunities>>> = ({ signal }) => listCommunities({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listCommunities>>, TError, TData> & { queryKey: QueryKey }
}

export type ListCommunitiesQueryResult = NonNullable<Awaited<ReturnType<typeof listCommunities>>>
export type ListCommunitiesQueryError = ErrorType<void>


/**
 * @summary SagaTrail-Communities verwalten
 */

export function useListCommunities<TData = Awaited<ReturnType<typeof listCommunities>>, TError = ErrorType<void>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listCommunities>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListCommunitiesQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getCreateCommunityUrl = () => {




  return `/api/admin/communities`
}

/**
 * @summary Neue SagaTrail-Community mit Einladung anlegen
 */
export const createCommunity = async (communityInput: CommunityInput, options?: RequestInit): Promise<CommunityInvitation> => {

  return customFetch<CommunityInvitation>(getCreateCommunityUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(communityInput)
  }
);}




export const getCreateCommunityMutationOptions = <TError = ErrorType<ErrorResponse | void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createCommunity>>, TError,{data: BodyType<CommunityInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof createCommunity>>, TError,{data: BodyType<CommunityInput>}, TContext> => {

const mutationKey = ['createCommunity'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof createCommunity>>, {data: BodyType<CommunityInput>}> = (props) => {
          const {data} = props ?? {};

          return  createCommunity(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type CreateCommunityMutationResult = NonNullable<Awaited<ReturnType<typeof createCommunity>>>
    export type CreateCommunityMutationBody = BodyType<CommunityInput>
    export type CreateCommunityMutationError = ErrorType<ErrorResponse | void>

    /**
 * @summary Neue SagaTrail-Community mit Einladung anlegen
 */
export const useCreateCommunity = <TError = ErrorType<ErrorResponse | void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createCommunity>>, TError,{data: BodyType<CommunityInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof createCommunity>>,
        TError,
        {data: BodyType<CommunityInput>},
        TContext
      > => {
      return useMutation(getCreateCommunityMutationOptions(options));
    }

export const getUpdateCommunityUrl = (id: string,) => {




  return `/api/admin/communities/${id}`
}

/**
 * @summary Community-Einladung aktualisieren oder deaktivieren
 */
export const updateCommunity = async (id: string,
    communityUpdate: CommunityUpdate, options?: RequestInit): Promise<CommunityInvitation> => {

  return customFetch<CommunityInvitation>(getUpdateCommunityUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(communityUpdate)
  }
);}




export const getUpdateCommunityMutationOptions = <TError = ErrorType<ErrorResponse | void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateCommunity>>, TError,{id: string;data: BodyType<CommunityUpdate>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateCommunity>>, TError,{id: string;data: BodyType<CommunityUpdate>}, TContext> => {

const mutationKey = ['updateCommunity'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateCommunity>>, {id: string;data: BodyType<CommunityUpdate>}> = (props) => {
          const {id,data} = props ?? {};

          return  updateCommunity(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateCommunityMutationResult = NonNullable<Awaited<ReturnType<typeof updateCommunity>>>
    export type UpdateCommunityMutationBody = BodyType<CommunityUpdate>
    export type UpdateCommunityMutationError = ErrorType<ErrorResponse | void>

    /**
 * @summary Community-Einladung aktualisieren oder deaktivieren
 */
export const useUpdateCommunity = <TError = ErrorType<ErrorResponse | void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateCommunity>>, TError,{id: string;data: BodyType<CommunityUpdate>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateCommunity>>,
        TError,
        {id: string;data: BodyType<CommunityUpdate>},
        TContext
      > => {
      return useMutation(getUpdateCommunityMutationOptions(options));
    }


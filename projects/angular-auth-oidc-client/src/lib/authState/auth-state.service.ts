import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConfigurationProvider } from '../config/config.provider';
import { LoggerService } from '../logging/logger.service';
import { EventTypes } from '../public-events/event-types';
import { PublicEventsService } from '../public-events/public-events.service';
import { StoragePersistanceService } from '../storage/storage-persistance.service';
import { TokenValidationService } from '../validation/token-validation.service';
import { AuthorizationResult } from './authorization-result';
import { AuthorizedState } from './authorized-state';

@Injectable()
export class AuthStateService {
    // event which contains the state
    private authorizedInternal$ = new BehaviorSubject<boolean>(false);
    private authState = AuthorizedState.Unknown;

    get authorized$() {
        return this.authorizedInternal$.asObservable();
    }

    constructor(
        private storagePersistanceService: StoragePersistanceService,
        private loggerService: LoggerService,
        private publicEventsService: PublicEventsService,
        private configurationProvider: ConfigurationProvider,
        private tokenValidationService: TokenValidationService
    ) {}

    setAuthorizedAndFireEvent(): void {
        // set the correct values in storage
        this.authState = AuthorizedState.Authorized;
        this.persistAuthStateInStorage(this.authState);
        this.authorizedInternal$.next(true);
    }

    setUnauthorizedAndFireEvent(): void {
        // set the correct values in storage
        this.authState = AuthorizedState.Unauthorized;
        this.storagePersistanceService.resetAuthStateInStorage();
        this.authorizedInternal$.next(false);
    }

    initStateFromStorage(): void {
        const currentAuthorizedState = this.getCurrentlyPersistedAuthState();
        if (currentAuthorizedState === AuthorizedState.Authorized) {
            this.authState = AuthorizedState.Authorized;
        } else {
            this.authState = AuthorizedState.Unknown;
        }
    }

    updateAndPublishAuthState(authorizationResult: AuthorizationResult) {
        this.publicEventsService.fireEvent<AuthorizationResult>(EventTypes.NewAuthorizationResult, authorizationResult);
    }

    setAuthorizationData(accessToken: any, idToken: any) {
        this.loggerService.logDebug(accessToken);
        this.loggerService.logDebug(idToken);
        this.loggerService.logDebug('storing to storage, getting the roles');

        this.storagePersistanceService.accessToken = accessToken;
        this.storagePersistanceService.idToken = idToken;

        this.setAuthorizedAndFireEvent();
    }

    getAccessToken(): string {
        if (!(this.authState === AuthorizedState.Authorized)) {
            return '';
        }

        const token = this.storagePersistanceService.getAccessToken();
        return decodeURIComponent(token);
    }

    getIdToken(): string {
        if (!(this.authState === AuthorizedState.Authorized)) {
            return '';
        }

        const token = this.storagePersistanceService.getIdToken();
        return decodeURIComponent(token);
    }

    getRefreshToken(): string {
        if (!(this.authState === AuthorizedState.Authorized)) {
            return '';
        }

        const token = this.storagePersistanceService.getRefreshToken();
        return decodeURIComponent(token);
    }

    areAuthStorageTokensValid() {
        const currentAuthState = this.getCurrentlyPersistedAuthState();

        if (currentAuthState !== AuthorizedState.Authorized) {
            return false;
        }

        this.loggerService.logDebug(`authorizedState in storage is ${currentAuthState}`);

        if (this.hasIdTokenExpired()) {
            this.loggerService.logDebug('persisted id_token is expired');
            return false;
        }

        if (this.hasAccessTokenExpiredIfExpiryExists()) {
            this.loggerService.logDebug('persisted access_token is expired');
            return false;
        }

        this.loggerService.logDebug('persisted id_token and access token are valid');
        return true;
    }

    setAuthResultInStorage(authResult: any) {
        this.storagePersistanceService.authResult = authResult;
    }

    hasIdTokenExpired() {
        const tokenToCheck = this.storagePersistanceService.idToken;
        const idTokenExpired = this.tokenValidationService.hasIdTokenExpired(
            tokenToCheck,
            this.configurationProvider.openIDConfiguration.renewTimeBeforeTokenExpiresInSeconds
        );

        if (idTokenExpired) {
            this.publicEventsService.fireEvent<boolean>(EventTypes.IdTokenExpired, idTokenExpired);
        }

        return idTokenExpired;
    }

    hasAccessTokenExpiredIfExpiryExists() {
        const accessTokenExpiresIn = this.storagePersistanceService.accessTokenExpiresIn;
        const accessTokenHasNotExpired = this.tokenValidationService.validateAccessTokenNotExpired(
            accessTokenExpiresIn,
            this.configurationProvider.openIDConfiguration.renewTimeBeforeTokenExpiresInSeconds
        );

        const hasExpired = !accessTokenHasNotExpired;

        if (hasExpired) {
            this.publicEventsService.fireEvent<boolean>(EventTypes.TokenExpired, hasExpired);
        }

        return hasExpired;
    }

    private getCurrentlyPersistedAuthState() {
        return this.storagePersistanceService.authorizedState;
    }

    private persistAuthStateInStorage(authState: AuthorizedState) {
        this.storagePersistanceService.authorizedState = authState;
    }
}

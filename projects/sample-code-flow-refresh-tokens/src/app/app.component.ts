import { Component, OnInit } from '@angular/core';
import { OidcClientNotification, OidcSecurityService, PublicConfiguration } from 'angular-auth-oidc-client';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {
    configuration: PublicConfiguration;
    userDataChanged$: Observable<OidcClientNotification<any>>;
    userData$: Observable<any>;
    isAuthenticated$: Observable<boolean>;
    constructor(public oidcSecurityService: OidcSecurityService) {}

    ngOnInit() {
        this.configuration = this.oidcSecurityService.configuration;
        this.userData$ = this.oidcSecurityService.userData$;
        this.isAuthenticated$ = this.oidcSecurityService.isAuthenticated$;

        this.oidcSecurityService.checkAuth().subscribe((isAuthenticated) => console.log('app authenticated', isAuthenticated));
    }

    login() {
        this.oidcSecurityService.authorize();
    }

    logout() {
        this.oidcSecurityService.logoff();
    }

    logoffAndRevokeTokens() {
        this.oidcSecurityService.logoffAndRevokeTokens().subscribe((result) => console.log(result));
    }

    revokeRefreshToken() {
        this.oidcSecurityService.revokeRefreshToken().subscribe((result) => console.log(result));
    }

    revokeAccessToken() {
        this.oidcSecurityService.revokeAccessToken().subscribe((result) => console.log(result));
    }
}

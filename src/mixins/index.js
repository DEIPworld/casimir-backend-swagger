import { AccessService } from '@deip/access-service';
import { AuthService } from '@deip/auth-service';
import { ProposalsService } from '@deip/proposals-service';
import { ProjectService } from '@deip/project-service';
import { TeamService } from '@deip/team-service';
import { AttributesService } from '@deip/attributes-service';
import { FungibleTokenService, NonFungibleTokenService, CommonTokenService } from '@casimir/token-service/src';
import { UserService } from '@deip/user-service';
import { NotificationService } from '@deip/notification-service';
import { BookmarkService } from '@deip/bookmark-service';
import { InvestmentOpportunityService } from '@deip/investment-opportunity-service';
import { DocumentTemplateService } from '@deip/document-template-service';
import { ProjectContentService } from '@deip/project-content-service';
import { ReviewService } from '@deip/review-service';
import { ProjectNdaService } from '@deip/project-nda-service';
import { ContractAgreementService } from '@deip/contract-agreement-service';
import { LayoutService } from '@deip/layout-service';
import { genRipemd160Hash } from '@deip/toolbox';

export const interceptorsMethodsMixin = {
  data() {
    return {
      operationsMap: {},
      accessService: AccessService.getInstance(),
      authService: AuthService.getInstance(),
      proposalsService: ProposalsService.getInstance(),
      projectService: ProjectService.getInstance(),
      teamService: TeamService.getInstance(),
      attributesService: AttributesService.getInstance(),
      fungibleTokenService: FungibleTokenService.getInstance(),
      nonFungibleTokenService: NonFungibleTokenService.getInstance(),
      commonTokenService: CommonTokenService.getInstance(),
      userService: UserService.getInstance(),
      notificationService: NotificationService.getInstance(),
      bookmarkService: BookmarkService.getInstance(),
      investmentOpportunityService: InvestmentOpportunityService.getInstance(),
      documentTemplateService: DocumentTemplateService.getInstance(),
      projectContentService: ProjectContentService.getInstance(),
      reviewService: ReviewService.getInstance(),
      projectNdaService: ProjectNdaService.getInstance(),
      contractAgreementService: ContractAgreementService.getInstance(),
      layoutService: LayoutService.getInstance()
    }
  },
  methods: {
    async wrapRequest(newrequest) {
      const request = { ...newrequest }
      const { body, url, method, headers } = request;
      const lowerCaseMethod = method ? method.toLowerCase() : '';
      if (lowerCaseMethod === 'post' || lowerCaseMethod === 'put') {
        const requestBody = JSON.parse(body);
        const operation = this.operationsMap[new URL(url).pathname][lowerCaseMethod];
        if (url.includes('/auth/sign-in')) {
          const exists = await this.userService.checkIfUserExists(requestBody.username);
          if (!exists) {
            return request;
          }
      
          const { data: seedUser } = await this.userService.getOne(requestBody.username);
          const seedAccount = await this.authService.generateSeedAccount(seedUser.username, requestBody.password);
          this.$currentUser.username = seedAccount.getUsername();
          this.$currentUser.privKey = seedAccount.getPrivKey();
          this.$currentUser.pubKey = seedAccount.getPubKey();
          request.body = JSON.stringify({
            username: seedAccount.getUsername(),
            secretSigHex: seedAccount.signString(this.$env.SIG_SEED)
          })
        } else if (method && operation) {
          const headersToLowerCase = (headers) => {
            const result = {}
            for(const key in headers) {
              result[key.toLowerCase()] = headers[key];
            }
            return result;
          };
          if (url.includes('/auth') && url.includes('/sign-up')) {  
            const username = genRipemd160Hash(requestBody.email);
            const seedAccount = await this.authService.generateSeedAccount(username, requestBody.password);
            const wrappedData = await this[operation.service][operation.method](
              {
                privKey: seedAccount.getPrivKey(),
                isAuthorizedCreatorRequired: seedAccount.isAuthorizedCreatorRequired()
              },
              {
                username: seedAccount.getUsername(),
                pubKey: seedAccount.getPubKey(),
                ...requestBody
              }
            );
            const body = wrappedData.getHttpBody();
            request.body = body instanceof FormData ? body : JSON.stringify(body);
            request.headers = {
              ...headersToLowerCase(headers),
              ...wrappedData.getHttpHeaders()
            };
          } else {
            const wrappedData = await this[operation.service][operation.method](
              {
                ...requestBody,
                data: requestBody,
                proposalInfo: requestBody.proposalInfo || {},
                initiator: this.$currentUser
              }
            );
            const body = wrappedData.getHttpBody();
            request.body = body instanceof FormData ? body : JSON.stringify(body);
            request.headers = {
              ...headersToLowerCase(headers),
              ...wrappedData.getHttpHeaders()
            };
          }
        }
        return request;
      }
      return request
    },
    parseResponse(response) {
      const { url, body } = response;
      if(url.includes('/swagger/v2/swagger')) {
        const splitRoute = (route) => {
          const splitedRoute = route.operationId.split('.');
          return {
            service: splitedRoute[0],
            method: splitedRoute[1]
          }
        };
        this.operationsMap = Object.keys(body.data.paths).reduce((obj, route) => {
          const postRoute = body.data.paths[route].post;
          const putRoute = body.data.paths[route].put;
          if (postRoute || putRoute) {
            obj[route] = {};
            if(postRoute) {
              obj[route].post = splitRoute(postRoute);
            }
            if(putRoute) {
              obj[route].put = splitRoute(putRoute)
            }
          }
          return obj;
        }, {})
        response.text = JSON.stringify(body.data)
      }
      if (url.includes('/auth/sign-in')) {
        if (!body.data.success) {
          this.accessService.clearAccessToken();
          this.$currentUser.username = '';
          this.$currentUser.privKey = '';
          this.$currentUser.pubKey = '';
          return response;
        }
        if (body.data.jwtToken && this.$currentUser.privKey && this.$currentUser.pubKey) {
          this.accessService.setAccessToken(body.data.jwtToken, this.$currentUser.privKey, this.$currentUser.pubKey);
        }
      }
      return response
    }
  }
};

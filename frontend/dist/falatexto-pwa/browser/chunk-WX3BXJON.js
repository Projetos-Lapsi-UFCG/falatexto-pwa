import{a as G}from"./chunk-KDUBBXRX.js";import{a as ce}from"./chunk-GHEHHQWW.js";import{a as me}from"./chunk-Z6ANFR34.js";import{a as ie,b as oe,d as de}from"./chunk-77OKYARD.js";import{c as D,e as w}from"./chunk-IGHWOQSW.js";import"./chunk-SQFYRXBB.js";import{a as fe,b as ue}from"./chunk-QA7K6H3X.js";import{a as le,e as se,f as pe}from"./chunk-ZPF7TZYO.js";import{b as X,f as W,j as Y,t as q}from"./chunk-INDZNQSI.js";import{a as ge}from"./chunk-MCD2ZNW3.js";import{a as S,b as I,h as ee,l as te,n as ae,o as re,q as ne}from"./chunk-BHQLAQU5.js";import{B as J,D as K,E as Z,z as $}from"./chunk-WMMX556V.js";import{n as M}from"./chunk-ZDIP4PFP.js";import{$ as P,$a as v,Cb as R,Eb as g,Gb as h,Hb as j,Ib as H,Ma as n,S as T,Sb as x,U as A,Ub as d,Vb as p,W as f,Wb as b,Xb as N,Yb as U,Zb as V,_b as Q,aa as E,ab as k,bb as B,cc as _,ec as c,fc as l,ob as y,pb as C,rb as z,sb as L,tb as s,ub as r,vb as i,wb as u}from"./chunk-A7JPWAXP.js";var xe=["*"];var _e=new A("MAT_CARD_CONFIG"),he=(()=>{class e{appearance;constructor(){let a=f(_e,{optional:!0});this.appearance=a?.appearance||"raised"}static \u0275fac=function(t){return new(t||e)};static \u0275cmp=v({type:e,selectors:[["mat-card"]],hostAttrs:[1,"mat-mdc-card","mdc-card"],hostVars:8,hostBindings:function(t,m){t&2&&x("mat-mdc-card-outlined",m.appearance==="outlined")("mdc-card--outlined",m.appearance==="outlined")("mat-mdc-card-filled",m.appearance==="filled")("mdc-card--filled",m.appearance==="filled")},inputs:{appearance:"appearance"},exportAs:["matCard"],ngContentSelectors:xe,decls:1,vars:0,template:function(t,m){t&1&&(j(),H(0))},styles:[`.mat-mdc-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  border-style: solid;
  border-width: 0;
  background-color: var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low));
  border-color: var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low));
  border-radius: var(--mat-card-elevated-container-shape, var(--mat-sys-corner-medium));
  box-shadow: var(--mat-card-elevated-container-elevation, var(--mat-sys-level1));
}
.mat-mdc-card::after {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: solid 1px transparent;
  content: "";
  display: block;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: var(--mat-card-elevated-container-shape, var(--mat-sys-corner-medium));
}

.mat-mdc-card-outlined {
  background-color: var(--mat-card-outlined-container-color, var(--mat-sys-surface));
  border-radius: var(--mat-card-outlined-container-shape, var(--mat-sys-corner-medium));
  border-width: var(--mat-card-outlined-outline-width, 1px);
  border-color: var(--mat-card-outlined-outline-color, var(--mat-sys-outline-variant));
  box-shadow: var(--mat-card-outlined-container-elevation, var(--mat-sys-level0));
}
.mat-mdc-card-outlined::after {
  border: none;
}

.mat-mdc-card-filled {
  background-color: var(--mat-card-filled-container-color, var(--mat-sys-surface-container-highest));
  border-radius: var(--mat-card-filled-container-shape, var(--mat-sys-corner-medium));
  box-shadow: var(--mat-card-filled-container-elevation, var(--mat-sys-level0));
}

.mdc-card__media {
  position: relative;
  box-sizing: border-box;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
.mdc-card__media::before {
  display: block;
  content: "";
}
.mdc-card__media:first-child {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}
.mdc-card__media:last-child {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

.mat-mdc-card-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
  min-height: 52px;
  padding: 8px;
}

.mat-mdc-card-title {
  font-family: var(--mat-card-title-text-font, var(--mat-sys-title-large-font));
  line-height: var(--mat-card-title-text-line-height, var(--mat-sys-title-large-line-height));
  font-size: var(--mat-card-title-text-size, var(--mat-sys-title-large-size));
  letter-spacing: var(--mat-card-title-text-tracking, var(--mat-sys-title-large-tracking));
  font-weight: var(--mat-card-title-text-weight, var(--mat-sys-title-large-weight));
}

.mat-mdc-card-subtitle {
  color: var(--mat-card-subtitle-text-color, var(--mat-sys-on-surface));
  font-family: var(--mat-card-subtitle-text-font, var(--mat-sys-title-medium-font));
  line-height: var(--mat-card-subtitle-text-line-height, var(--mat-sys-title-medium-line-height));
  font-size: var(--mat-card-subtitle-text-size, var(--mat-sys-title-medium-size));
  letter-spacing: var(--mat-card-subtitle-text-tracking, var(--mat-sys-title-medium-tracking));
  font-weight: var(--mat-card-subtitle-text-weight, var(--mat-sys-title-medium-weight));
}

.mat-mdc-card-title,
.mat-mdc-card-subtitle {
  display: block;
  margin: 0;
}
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-title,
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-subtitle {
  padding: 16px 16px 0;
}

.mat-mdc-card-header {
  display: flex;
  padding: 16px 16px 0;
}

.mat-mdc-card-content {
  display: block;
  padding: 0 16px;
}
.mat-mdc-card-content:first-child {
  padding-top: 16px;
}
.mat-mdc-card-content:last-child {
  padding-bottom: 16px;
}

.mat-mdc-card-title-group {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.mat-mdc-card-avatar {
  height: 40px;
  width: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-bottom: 16px;
  object-fit: cover;
}
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-subtitle,
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-title {
  line-height: normal;
}

.mat-mdc-card-sm-image {
  width: 80px;
  height: 80px;
}

.mat-mdc-card-md-image {
  width: 112px;
  height: 112px;
}

.mat-mdc-card-lg-image {
  width: 152px;
  height: 152px;
}

.mat-mdc-card-xl-image {
  width: 240px;
  height: 240px;
}

.mat-mdc-card-subtitle ~ .mat-mdc-card-title,
.mat-mdc-card-title ~ .mat-mdc-card-subtitle,
.mat-mdc-card-header .mat-mdc-card-header-text .mat-mdc-card-title,
.mat-mdc-card-header .mat-mdc-card-header-text .mat-mdc-card-subtitle,
.mat-mdc-card-title-group .mat-mdc-card-title,
.mat-mdc-card-title-group .mat-mdc-card-subtitle {
  padding-top: 0;
}

.mat-mdc-card-content > :last-child:not(.mat-mdc-card-footer) {
  margin-bottom: 0;
}

.mat-mdc-card-actions-align-end {
  justify-content: flex-end;
}
`],encapsulation:2,changeDetection:0})}return e})();var be=(()=>{class e{static \u0275fac=function(t){return new(t||e)};static \u0275dir=B({type:e,selectors:[["mat-card-content"]],hostAttrs:[1,"mat-mdc-card-content"]})}return e})();var ye=(()=>{class e{static \u0275fac=function(t){return new(t||e)};static \u0275mod=k({type:e});static \u0275inj=T({imports:[J]})}return e})();function Se(e,o){if(e&1&&(r(0,"span",11),d(1),i()),e&2){let a=h();x("badge-template",a.form.type==="template"),n(),b(" ",a.form.type," ")}}var O=class e{form;router=f(M);languageService=f(me);hovered=!1;navigate(){this.router.navigate(["/forms",this.form.id])}formatDate(o){return new Date(o).toLocaleDateString(this.languageService.getCurrentLanguage(),{month:"short",day:"numeric",year:"numeric"})}static \u0275fac=function(a){return new(a||e)};static \u0275cmp=v({type:e,selectors:[["app-form-card"]],inputs:{form:"form"},features:[_([S({lucideFileText:ee})])],decls:19,vars:9,consts:[[1,"form-card",3,"mouseenter","mouseleave","click"],[1,"form-card-content"],[1,"form-card-icon"],["name","lucideFileText","size","24"],[1,"form-card-body"],[1,"form-card-header"],[1,"form-card-title"],[1,"form-badge",3,"badge-template"],[1,"form-card-entity"],[1,"form-card-meta"],[1,"meta-sep"],[1,"form-badge"]],template:function(a,t){a&1&&(r(0,"mat-card",0),g("mouseenter",function(){return t.hovered=!0})("mouseleave",function(){return t.hovered=!1})("click",function(){return t.navigate()}),r(1,"mat-card-content",1)(2,"div",2),u(3,"ng-icon",3),i(),r(4,"div",4)(5,"div",5)(6,"h3",6),d(7),i(),y(8,Se,2,3,"span",7),i(),r(9,"p",8),d(10),i(),r(11,"div",9)(12,"span"),d(13),c(14,"translate"),i(),r(15,"span",10),d(16,"\xB7"),i(),r(17,"span"),d(18),i()()()()()),a&2&&(s("@hoverScale",t.hovered),n(7),p(t.form.name),n(),C(t.form.type?8:-1),n(2),p(t.form.entity),n(3),N("",t.form.questions," ",l(14,7,"FORM_CARD.QUESTIONS_SUFFIX")),n(5),p(t.formatDate(t.form.createdAt)))},dependencies:[ye,he,be,I,w,D],styles:[".form-card[_ngcontent-%COMP%]{border-radius:var(--radius-xl)!important;border:1px solid var(--color-neutral-200)!important;box-shadow:var(--shadow-sm)!important;cursor:pointer;transition:box-shadow .2s ease}.form-card[_ngcontent-%COMP%]:hover{box-shadow:var(--shadow-lg)!important}.form-card-content[_ngcontent-%COMP%]{display:flex;gap:1rem;padding:1.25rem!important}.form-card-icon[_ngcontent-%COMP%]{display:flex;align-items:flex-start;padding-top:.125rem;color:var(--color-neutral-700);flex-shrink:0}.form-card-body[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.375rem;flex:1;min-width:0}.form-card-header[_ngcontent-%COMP%]{display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem}.form-card-title[_ngcontent-%COMP%]{font-family:var(--font-serif);font-size:1.1rem;font-weight:600;color:var(--color-neutral-900);line-height:1.3;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.form-badge[_ngcontent-%COMP%]{font-size:.7rem;font-weight:500;padding:.15rem .5rem;border-radius:var(--radius-lg);background:var(--color-neutral-100);color:var(--color-neutral-700);text-transform:capitalize;flex-shrink:0}.badge-template[_ngcontent-%COMP%]{background:#eff6ff;color:#1d4ed8}.form-card-entity[_ngcontent-%COMP%]{font-size:.85rem;color:var(--color-neutral-600)}.form-card-meta[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.375rem;font-size:.8rem;color:var(--color-neutral-400)}.meta-sep[_ngcontent-%COMP%]{color:var(--color-neutral-300)}"],data:{animation:[de]}})};var Ie=(e,o)=>o.id;function Oe(e,o){if(e&1&&u(0,"app-form-card",21),e&2){let a=o.$implicit;s("form",a)}}function Fe(e,o){if(e&1&&(r(0,"div",19),z(1,Oe,1,1,"app-form-card",21,Ie),i()),e&2){let a=h();s("@staggerFade",a.filteredForms.length),n(),L(a.filteredForms)}}function Te(e,o){if(e&1){let a=R();r(0,"div",20)(1,"p",22),d(2),c(3,"translate"),i(),r(4,"p",23),d(5),c(6,"translate"),i(),r(7,"button",24),g("click",function(){P(a);let m=h();return E(m.createForm())}),d(8),c(9,"translate"),i()()}e&2&&(s("@fadeIn",void 0),n(2),p(l(3,4,"DASHBOARD.EMPTY_TITLE")),n(3),p(l(6,6,"DASHBOARD.EMPTY_SUBTITLE")),n(3),p(l(9,8,"DASHBOARD.CREATE_FORM")))}var Ce=class e{authService=f(G);formService=f(ge);router=f(M);userType=null;forms=[];filteredForms=[];searchQuery="";subscription;ngOnInit(){this.userType=this.authService.getCurrentUserType(),this.subscription=this.formService.forms$.subscribe(o=>{this.forms=o,this.filteredForms=o})}ngOnDestroy(){this.subscription?.unsubscribe()}onSearch(){this.filteredForms=this.formService.searchForms(this.searchQuery)}logout(){this.authService.logout()}createForm(){this.router.navigate(["/create"])}static \u0275fac=function(a){return new(a||e)};static \u0275cmp=v({type:e,selectors:[["app-dashboard"]],features:[_([S({lucideSearch:re,lucidePlus:ae,lucideLogOut:te,lucideUser:ne})])],decls:33,vars:20,consts:[[1,"dashboard-wrapper","min-h-screen","bg-neutral-50"],[1,"dashboard-header"],[1,"fixed-actions"],["mat-icon-button","",3,"click","title"],["name","lucideLogOut","size","24"],[1,"header-inner"],[1,"header-left"],[1,"dashboard-title"],[1,"user-badge"],["name","lucideUser","size","14"],[1,"header-actions"],["mat-raised-button","","color","primary",1,"create-btn",3,"click"],["name","lucidePlus","size","16"],[1,"search-bar-wrapper"],[1,"search-inner"],["appearance","outline",1,"search-field"],["name","lucideSearch","size","16"],["matInput","",3,"ngModelChange","ngModel","placeholder"],[1,"forms-main"],[1,"forms-grid"],[1,"empty-state"],[3,"form"],[1,"empty-title"],[1,"empty-subtitle"],["mat-stroked-button","",3,"click"]],template:function(a,t){a&1&&(r(0,"div",0)(1,"header",1)(2,"div",2),u(3,"app-language-selector"),r(4,"button",3),c(5,"translate"),g("click",function(){return t.logout()}),u(6,"ng-icon",4),i()(),r(7,"div",5)(8,"div",6)(9,"h1",7),d(10),c(11,"translate"),i(),r(12,"div",8),u(13,"ng-icon",9),r(14,"span"),d(15),i()()(),r(16,"div",10)(17,"button",11),g("click",function(){return t.createForm()}),u(18,"ng-icon",12),d(19),c(20,"translate"),i()()()(),r(21,"div",13)(22,"div",14)(23,"mat-form-field",15)(24,"mat-label"),u(25,"ng-icon",16),d(26),c(27,"translate"),i(),r(28,"input",17),c(29,"translate"),Q("ngModelChange",function(F){return V(t.searchQuery,F)||(t.searchQuery=F),F}),g("ngModelChange",function(){return t.onSearch()}),i()()()(),r(30,"main",18),y(31,Fe,3,1,"div",19)(32,Te,10,10,"div",20),i()()),a&2&&(n(),s("@fadeIn",void 0),n(3),s("title",l(5,10,"DASHBOARD.LOGOUT_TITLE")),n(6),p(l(11,12,"DASHBOARD.TITLE")),n(5),p(t.userType),n(4),b(" ",l(20,14,"DASHBOARD.NEW_FORM")," "),n(2),s("@fadeIn",void 0),n(5),b(" ",l(27,16,"DASHBOARD.SEARCH_LABEL")," "),n(2),U("ngModel",t.searchQuery),s("placeholder",l(29,18,"DASHBOARD.SEARCH_PLACEHOLDER")),n(3),C(t.filteredForms.length>0?31:32))},dependencies:[q,X,W,Y,Z,K,$,pe,se,le,ue,fe,I,O,w,ce,D],styles:[".dashboard-wrapper[_ngcontent-%COMP%]{background:var(--color-neutral-50)}.dashboard-header[_ngcontent-%COMP%]{background:var(--color-primary-900);border-bottom:1px solid var(--color-primary-700);position:sticky;top:0;z-index:100}.header-inner[_ngcontent-%COMP%], .fixed-actions[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;max-width:80rem;margin:0 auto}.header-inner[_ngcontent-%COMP%]{margin-right:150px}.fixed-actions[_ngcontent-%COMP%]{position:absolute;right:0;top:0}.header-left[_ngcontent-%COMP%]{display:flex;align-items:center;gap:1rem}.dashboard-title[_ngcontent-%COMP%]{font-family:var(--font-serif);font-size:1.75rem;font-weight:600;color:var(--color-white)}.user-badge[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.375rem;font-size:.8rem;font-weight:500;color:var(--color-primary-200);background:var(--color-primary-700);padding:.25rem .625rem;border-radius:var(--radius-lg);text-transform:capitalize}.header-actions[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.75rem}.create-btn[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.375rem;font-family:var(--font-sans)!important}.search-bar-wrapper[_ngcontent-%COMP%]{padding:1.5rem 2rem 0;max-width:80rem;margin:0 auto}.search-inner[_ngcontent-%COMP%]{max-width:32rem}.search-field[_ngcontent-%COMP%]{width:100%}.forms-main[_ngcontent-%COMP%]{padding:1.5rem 2rem 3rem;max-width:80rem;margin:0 auto}.forms-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem}@media(max-width:900px){.forms-grid[_ngcontent-%COMP%]{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.forms-grid[_ngcontent-%COMP%]{grid-template-columns:1fr}.header-inner[_ngcontent-%COMP%]{padding:1rem;flex-flow:wrap}.search-bar-wrapper[_ngcontent-%COMP%], .forms-main[_ngcontent-%COMP%]{padding-left:1rem;padding-right:1rem}.header-actions[_ngcontent-%COMP%]{margin-top:2rem}}.empty-state[_ngcontent-%COMP%]{text-align:center;padding:5rem 2rem;display:flex;flex-direction:column;align-items:center;gap:.75rem}.empty-title[_ngcontent-%COMP%]{font-family:var(--font-serif);font-size:1.5rem;color:var(--color-neutral-800)}.empty-subtitle[_ngcontent-%COMP%]{color:var(--color-neutral-600);font-size:.95rem;margin-bottom:.5rem}span.mdc-button__label[_ngcontent-%COMP%]{border:2px solid #dd0031;text-transform:uppercase;margin-top:5px;color:red!important}"],data:{animation:[ie,oe]}})};export{Ce as DashboardComponent};

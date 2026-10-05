/* Teknisi Tools Indonesia — analytics-ready loader.
   Leave IDs empty to keep analytics disabled. */
window.TTI_ANALYTICS = window.TTI_ANALYTICS || {
  ga4MeasurementId: '',
  cloudflareToken: ''
};
(function(c){
  if(c.ga4MeasurementId){
    var s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(c.ga4MeasurementId); document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[]; window.gtag=function(){dataLayer.push(arguments)}; gtag('js',new Date()); gtag('config',c.ga4MeasurementId,{anonymize_ip:true});
  }
  if(c.cloudflareToken){
    var b=document.createElement('script'); b.defer=true; b.src='https://static.cloudflareinsights.com/beacon.min.js'; b.setAttribute('data-cf-beacon',JSON.stringify({token:c.cloudflareToken})); document.head.appendChild(b);
  }
})(window.TTI_ANALYTICS);

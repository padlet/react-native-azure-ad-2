import React, {
	Component
} from 'react'
import {
	Dimensions,
	AsyncStorage,
	Platform,
	StyleSheet,
	View,
	Text
} from 'react-native'

import { WebView } from 'react-native-webview';
import AzureInstance from './AzureInstance'
import Auth from './Auth';

export default class AzureLoginView extends React.Component {
	props : {
		azureInstance: AzureInstance,
		onSuccess? : ?Function
	};

	state : {
	    visible: bool
  	};

	constructor(props:any){
		super(props);

		this.auth = new Auth(this.props.azureInstance);
		this.state = {
			visible: true
		}

		this._handleTokenRequest = this._handleTokenRequest.bind(this);
		this._renderLoadingView = this._renderLoadingView.bind(this);
	}

	_handleTokenRequest(e:{ url:string }):any{

		// stop loading if we hit the redirect URI, because otherwise it will
		// error out. (Android specific, as mentioned in
		// https://james1888.github.io/posts/react-native-prevent-webview-redirect/)
		// if (e.url == this.auth.redirect_uri) {
		if (e.url.startsWith(this.auth.redirect_uri)) {
			if (!!this.webView && !!this.webView.stopLoading) {
				this.webView.stopLoading()
			}
		}

		// get code when url chage
		let code = /((\?|\&)code\=)[^\&]+/.exec(e.url);

		if( code !== null ){
			code = String(code[0]).replace(/(\?|\&)?code\=/,'');
			console.log("[AzureLoginView] Found code:", code);
			this.setState({visible : false})

			// request for a token
			this.auth.getTokenFromCode(code).then(token => {
				// set token to instance
				this.props.azureInstance.setToken(token);

				// call success handler
				this.props.onSuccess();
			})
			.catch((err) => {
				console.log("[ReactNativeAzure] Error:", err);
        		throw new Error(err);
      		})
		}
  	}

  	_renderLoadingView(){
  		return this.props.loadingView === undefined ? (
  			<View
  				style={[this.props.style, styles.loadingView,
  					{
						flex:1,
						alignSelf : 'stretch',
						width : Dimensions.get('window').width,
						height : Dimensions.get('window').height
					}
				]}
  			>
  				<Text>{this.props.loadingMessage}</Text>
  			</View>
  		) : this.props.loadingView
  	}

	render() {
		let js = `document.getElementsByTagName('body')[0].style.height = '${Dimensions.get('window').height}px';`
		const uri = this.auth.getAuthUrl();
		console.log("[AzureLoginView] uri:",{ uri });
   		return (
			this.state.visible ? (
				<WebView
					automaticallyAdjustContentInsets={true}
					style={[this.props.style, styles.webView, {
						flex:1,
						alignSelf : 'stretch',
						width : Dimensions.get('window').width,
						height : Dimensions.get('window').height
					}]}
					source={{uri: this.auth.getAuthUrl()}}
					javaScriptEnabled={true}
					domStorageEnabled={true}
					decelerationRate="normal"
					javaScriptEnabledAndroid={true}
					onNavigationStateChange={this._handleTokenRequest}
					// handling redirects on iOS -- don't allow loading
					// if it's the redirect URI.
					// With reference to https://james1888.github.io/posts/react-native-prevent-webview-redirect/
					onShouldStartLoadWithRequest={ ({ url }) => {
						return true;
						// return this.auth.redirect_uri && !url.startsWith(this.auth.redirect_uri)
					}}
					startInLoadingState={true}
					injectedJavaScript={js}
					scalesPageToFit={true}
					ref={c => { this.webView = c }}
				/> ) : this._renderLoadingView()
		)
   	}

}

const styles = StyleSheet.create({
	webView: {
// 		marginTop: 50
	},
	loadingView: {
		alignItems: 'center',
		justifyContent: 'center'
	}
});

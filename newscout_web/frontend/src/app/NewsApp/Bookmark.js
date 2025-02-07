import React from 'react';
import moment from 'moment';
import ReactDOM from 'react-dom';
import Cookies from 'universal-cookie';
import Skeleton from 'react-loading-skeleton';
import bookmark_empty from './bookmark-empty.png'
import { CardItem, Menu, SectionTitle, SideBar, VerticleCardItem, Footer, VerticleCardAd } from 'newscout';

import Auth from './Auth';

import { BASE_URL, MENUS, ARTICLE_BOOKMARK, ALL_ARTICLE_BOOKMARK, ARTICLE_LOGOUT, SUGGESTIONS } from '../../utils/Constants';
import { getRequest, postRequest } from '../../utils/Utils';

import './style.css';
import 'newscout/assets/Menu.css'
import 'newscout/assets/ImageOverlay.css'
import 'newscout/assets/CardItem.css'
import 'newscout/assets/SectionTitle.css'
import 'newscout/assets/Sidebar.css'

import config_data from './config.json';

var article_array = [];
const URL = "/news/search/"
const cookies = new Cookies();

class Bookmark extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {
			newsPosts: [],
			menus: [],
			domain: "domain="+DOMAIN,
			isLoading: true,
			isSideOpen: true,
			modal: false,
			is_loggedin: false,
			is_loggedin_validation: false,
			username: cookies.get('full_name'),
			bookmark_ids: [],
			isChecked: false,
			options: [],
			is_bookmark_empty: false
		};
	}

	loggedInUser = (data) => {
		this.setState({
			username: data,
			is_loggedin: true
		})
	}

	toggle = (data) => {
		this.setState({
			modal: !data,
		})
	}

	toggleSwitch = (data) => {
		if(data === true){
			if(document.getElementById("dark_style")){
				document.getElementById("dark_style").disabled = false;
			} else {
				var head  = document.getElementsByTagName('head')[0];
				var link  = document.createElement('link');
				link.id = 'dark_style'
				link.rel  = 'stylesheet';
				link.type = 'text/css';
				link.href = '/static/css/dark-style.css';
				link.media = 'all';
				head.appendChild(link);
			}
			this.setState({ isChecked: true })
			cookies.set('isChecked', true, { path: '/' });
		} else {
			if(document.getElementById("dark_style")){
				document.getElementById("dark_style").disabled = true;
			}
			this.setState({ isChecked: false })
			cookies.remove('isChecked', { path: '/' });
		}
	}

	getTheme = () => {
		if(cookies.get('isChecked')){
			if(document.getElementById("dark_style")){
				document.getElementById("dark_style").disabled = false;
			} else {
				var head  = document.getElementsByTagName('head')[0];
				var link  = document.createElement('link');
				link.id = 'dark_style';
				link.rel  = 'stylesheet';
				link.type = 'text/css';
				link.href = '/static/css/dark-style.css';
				link.media = 'all';
				head.appendChild(link);
			}
		} else {
			if(document.getElementById("dark_style")){
				document.getElementById("dark_style").disabled = true;
			}
		}
	}

	getArticleId = (articleId) => {
		if(cookies.get('full_name')){
			this.fetchArticleBookmark(articleId)
		} else {
			this.toggle()
		}
	}

	fetchArticleBookmark = (articleId) => {
		var headers = {"Authorization": "Token "+cookies.get('token'), "Content-Type": "application/json"}
		var url = ARTICLE_BOOKMARK+"?"+this.state.domain;
		var body = JSON.stringify({article_id: articleId})
		postRequest(url, body, this.articleBookmarkResponse, "POST", headers)
	}

	articleBookmarkResponse = (data) => {
		var bookmark_obj = data.body.bookmark_article;
		var index = this.state.newsPosts.indexOf(bookmark_obj.article);
		this.state.newsPosts.splice(index, 1);
		this.setState({
			newsPosts: this.state.newsPosts
		})
		if(cookies.get('full_name')){
			var headers = {"Authorization": "Token "+cookies.get('token'), "Content-Type": "application/json"}
			getRequest(ALL_ARTICLE_BOOKMARK+"?"+this.state.domain, this.getBookmarksArticles, headers);
		}
	}

	getMenu = (data) => {
		var menus_array = []
		data.body.results.map((item, index) => {
			if(item.heading){
				var heading_dict = {}
				heading_dict['itemtext'] = item.heading.name
				heading_dict['itemurl'] = "news/"+item.heading.name.replace(" ", "-").toLowerCase()
				heading_dict['item_id'] = item.heading.category_id
				heading_dict['item_icon'] = item.heading.icon
				menus_array.push(heading_dict)
			}
		})
		this.setState({
			menus: menus_array
		})
	}

	isSideBarToogle = (data) => {
		if(data === true){
			this.setState({ isSideOpen: true })
			cookies.set('isSideOpen', true, { path: '/' });
		} else {
			this.setState({ isSideOpen: false })
			cookies.remove('isSideOpen', { path: '/' });
		}
	}

	getBookmarksArticles = (data) => {
		var news_array = []
		data.body.results.map((item, index) => {
			if(item.article.cover_image){
				var article_dict = {}
				article_dict['id'] = item.article.id
				article_dict['header'] = item.article.title
				article_dict['altText'] = item.article.title
				article_dict['caption'] = item.article.blurb
				article_dict['source'] = item.article.source
				article_dict['slug'] = "/news/article/"+item.article.slug
				article_dict['category'] = item.article.category
				article_dict['hash_tags'] = item.article.hash_tags
				article_dict['published_on'] = moment(item.article.published_on).format('D MMMM YYYY')
				article_dict['src'] = "http://images.newscout.in/unsafe/368x276/left/top/"+decodeURIComponent(item.article.cover_image)
				news_array.push(article_dict)
				article_array.push(item.article)
			}
		})
		this.setState({
			newsPosts: news_array,
			bookmark_ids: article_array,
			is_bookmark_empty: news_array.length > 0 ? false : true
		})
		setTimeout(() => {
			this.setState({isLoading: false})
		}, 300)
	}

	handleLogout = () => {
		var headers = {"Authorization": "Token "+cookies.get('token'), "Content-Type": "application/json"}
        getRequest(ARTICLE_LOGOUT, this.authLogoutResponse, headers);
    }

    authLogoutResponse = (data) => {
    	cookies.remove('token', { path: '/' })
    	cookies.remove('full_name', { path: '/' })
        this.setState({
			is_loggedin: false,
			is_captcha: true,
			bookmark_ids: []
		})
		window.location.href = "/"
    }

    handleSearch = (query) => {
		var url = SUGGESTIONS+"?q="+query+"&"+this.state.domain
		getRequest(url, this.getSuggestionsResponse)
	}

	getSuggestionsResponse = (data) => {
		var options_array = []
		var results = data.body.result;
		results.map((item, index) => {
			options_array.push(item.value)
		})
		this.setState({
			options: options_array
		})
	}

	componentDidMount() {
		getRequest(MENUS+"?"+this.state.domain, this.getMenu);
		if(cookies.get('full_name')){
			this.setState({is_loggedin:true})
			var headers = {"Authorization": "Token "+cookies.get('token'), "Content-Type": "application/json"}
			getRequest(ALL_ARTICLE_BOOKMARK+"?"+this.state.domain, this.getBookmarksArticles, headers);
		} else {
			window.location.href = "/"
		}
		if(cookies.get('isChecked')){
			this.setState({ isChecked: true })
		} else {
			this.setState({ isChecked: false })
		}
		if(cookies.get('isSideOpen')){
			this.setState({ isSideOpen: true })
		} else {
			this.setState({ isSideOpen: false })
		}
		this.getTheme()
	}

	render() {
		var { menus, newsPosts, isSideOpen, isLoading, modal, is_loggedin, bookmark_ids, username, isChecked, options, is_bookmark_empty } = this.state;

		var results = newsPosts.map((item, index) => {
			return (
				<div className="col-lg-4 col-md-4 mb-4" key={index}>
					{isLoading ?
						<Skeleton height={525} />
					: 
						<VerticleCardItem
							id={item.id}
							image={item.src}
							title={item.header}
							description={item.caption}
							uploaded_by={item.source}
							source_url={item.slug}
							slug_url={item.slug}
							category={item.category}
							hash_tags={item.hash_tags}
							uploaded_on={item.published_on}
							is_loggedin={is_loggedin}
							toggle={this.toggle}
							is_open={modal}
							getArticleId={this.getArticleId}
							bookmark_ids={bookmark_ids}
							base_url={BASE_URL}
						/>
					}
				</div>
			)
		})

		return(
			<React.Fragment>
				<Menu
					navitems={menus}
					url={URL}
					isSlider={true}
					isSideBarToogle={this.isSideBarToogle}
					isSideOpen={isSideOpen}
					toggle={this.toggle}
					is_loggedin={is_loggedin}
					username={username}
					handleLogout={this.handleLogout}
					toggleSwitch={this.toggleSwitch}
					isChecked={isChecked}
					handleSearch={this.handleSearch}
					options={options}
				/>
				
				<div className="container-fluid">
					<div className="row">
						<SideBar menuitems={menus} class={isSideOpen} isChecked={isChecked} />
						<div className={`main-content ${isSideOpen ? 'offset-lg-2 col-lg-10' : 'col-lg-12'}`}>
							<div className="container">
								<div className="pt-50">
									<div className="row">
										<div className="col-lg-12 mb-4">
											<div className="section-title">
												<h2 className="m-0 section-title">Bookmark Articles </h2>
											</div>
										</div>
									</div>
								</div>
								<div className="row">
									<div className="col-lg-12">
										<div className="row">
											<React.Fragment>
												{
													this.state.loadingPagination ?
														<React.Fragment>
															<div className="lds-ring text-center"><div></div><div></div><div></div><div></div></div>
														</React.Fragment>
												: ""
												}
												{results}
												{is_bookmark_empty ?
													<div className="col-lg-12 text-center">
														<div className="m-5 mb-0">
															<img src={bookmark_empty} className="img-fluid" style={{height: '100px'}} />
														</div>
														<div className="mt-0 mb-5">
															<h4 className="text-center">Bookmarks allow you keep track of stories you'd like to remember.</h4>
															<h3 className="text-center" style={{color:"#f0442c"}}>Start Bookmarking now</h3>
														</div>
													</div>
												: ""
												}
											</React.Fragment>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<Auth is_open={modal} toggle={this.toggle} loggedInUser={this.loggedInUser} />

				<Footer privacyurl="#" facebookurl="#" twitterurl="#" />
			</React.Fragment>
		)
	}
}

const wrapper = document.getElementById("bookmark");
wrapper ? ReactDOM.render(<Bookmark />, wrapper) : null;
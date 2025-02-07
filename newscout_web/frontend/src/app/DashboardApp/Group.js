import React from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import Cookies from 'universal-cookie';
import logo from '../NewsApp/logo.png';
import SelectComponent from './SelectComponent';
import { ToastContainer } from 'react-toastify';
import { Menu, SideBar, Footer } from 'newscout';
import * as serviceWorker from './serviceWorker';
import { GROUP_URL, CATEGORIES_CAMPAIGN_URL } from '../../utils/Constants';
import { getRequest, postRequest, putRequest, deleteRequest, notify, authHeaders } from '../../utils/Utils';
import { Button, Form, FormGroup, Input, Label, FormText, Modal, ModalHeader, ModalBody, ModalFooter, Row, Col, Table } from 'reactstrap';

import './index.css';
import config_data from '../NewsApp/config.json';

import 'newscout/assets/Menu.css'
import 'newscout/assets/Sidebar.css'

const cookies = new Cookies();

export default class Group extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			modal: false,
			fields: {},
			errors: {},
			rows: {},
			formSuccess: false,
			categories: [],
			campaigns: [],
			results: [],
			next: null,
			previous: null,
			loading: false,
			q: "",
			page: 0,
			isSideOpen: true,
			username: USERNAME,
			isChecked: false,
		};
	}

	handleQueryChange = (event) => {
		var value = event.target.value;
		this.setState({
			q: value
		})
	}

	handleKeyPress = (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			this.setState({
				results: []
			})
			var url = GROUP_URL + "?q=" + this.state.q;
			getRequest(url, this.getGroupsData, authHeaders);
		}
	}

	handleValidation = () => {
		let fields = this.state.fields;
		let errors = {};
		let formIsValid = true;
		let required_msg = "This fields is required";

		//Category
		if (!fields["category"]) {
			formIsValid = false;
			errors["category"] = required_msg;
		}

		//Campaign
		if (!fields["campaign"]) {
			formIsValid = false;
			errors["campaign"] = required_msg;
		}

		this.setState({ errors: errors });
		return formIsValid;
	}

	handleChange = (field, e, is_editable) => {
		let fields = this.state.fields;
		if (field === "category") {
			var selected_category_array = []
			if (e !== null) {
				e.map((item, index) => {
					if (is_editable) {
						let category_dict = {}
						category_dict['value'] = item.value
						category_dict['label'] = item.name
						category_dict['name'] = item.name
						selected_category_array.push(category_dict)
						fields[field] = selected_category_array;
					} else {
						selected_category_array.push(item.value)
						fields[field] = selected_category_array;
					}
				})
			}
		} else if (field === "is_active") {
			fields[field] = e.target.checked;
		} else {
			var campaign_array = []
			if (e !== null) {
				if (is_editable) {
					let category_dict = {}
					category_dict['value'] = e.value
					category_dict['label'] = e.name
					category_dict['name'] = e.name
					campaign_array.push(category_dict)
					fields[field] = category_dict;
				} else {
					fields[field] = e.value;
				}
			}
		}
		if (this.handleValidation()) {
			this.setState({ fields });
		}
	}

	groupSubmitResponse = (data, extra_data) => {
		this.setState({ 'formSuccess': true });
		if (extra_data.clean_results) {
			setTimeout(() => {
				this.setState({ 'modal': false, 'formSuccess': false, results: [], loading: true });
				this.getGroups()
			}, 3000);
		} else {
			setTimeout(() => {
				this.setState({ 'modal': false, 'formSuccess': false });
				this.getGroups()
			}, 3000);
		}
	}

	groupSubmit = (e) => {
		e.preventDefault();

		if (this.handleValidation()) {
			const body = JSON.stringify(this.state.fields)
			var extra_data = { "clean_results": true };
			postRequest(GROUP_URL, body, this.groupSubmitResponse, "POST", authHeaders, extra_data);
		} else {
			this.setState({ 'formSuccess': false });
		}
	}

	toggle = () => {
		this.setState(prevState => ({
			modal: !prevState.modal
		}));
	}

	submitRow = (e) => {
		e.preventDefault();

		if (this.handleValidation()) {
			var final_category = [];
			this.state.fields['category'].map(function (i, x) { final_category.push(i.value) })
			var body = { 'campaign': this.state.fields['campaign'].value, 'category': final_category, 'id': this.state.fields.id, 'is_active': this.state.fields['is_active'] }
			var url = GROUP_URL + this.state.fields.id + "/";
			var extra_data = { "clean_results": true };
			putRequest(url, JSON.stringify(body), this.groupUpdateResponse, "PUT", authHeaders, extra_data);
		}
	}

	groupUpdateResponse = (data, extra_data) => {
		notify("Group Updated successfully")
		let dataindex = data.body.id;
		let rows = this.state.rows;
		rows[dataindex] = false
		this.getGroups();
		if (extra_data.clean_results) {
			this.setState({ rows: rows, results: [], loading: true });
		} else {
			this.setState({ rows });
		}
	}

	editRow = (e) => {
		let index = e.target.getAttribute('index');
		let dataindex = e.target.getAttribute('data-id');
		let rows = this.state.rows;
		let fields = this.state.results[index];
		var selected_category_array = [];
		var campaign_array = [];
		if (fields['category'] !== null) {
			fields['category'].map((item, index) => {
				let category_dict = {}
				category_dict['value'] = item.id || item.value;
				category_dict['label'] = item.name
				category_dict['name'] = item.name
				selected_category_array.push(category_dict)
			})
		}
		if (fields['campaign'] != null) {
			let campaign_dict = {}
			campaign_dict['value'] = fields['campaign'].id
			campaign_dict['label'] = fields['campaign'].name
			campaign_dict['name'] = fields['campaign'].name
			campaign_array.push(campaign_dict)
		}
		fields['category'] = selected_category_array;
		fields['campaign'] = campaign_array[0];
		rows[dataindex] = true
		var state = this.state;
		state.rows = rows;
		state.fields = fields;
		this.setState(state);
	}

	cancelRow = (e) => {
		let index = e.target.getAttribute('index');
		let dataindex = e.target.getAttribute('data-id');
		let rows = this.state.rows;
		rows[dataindex] = false
		this.setState({ rows });
	}

	deleteGroupResponse = (data, extra_data) => {
		var findrow = extra_data;
		setTimeout(() => {
			findrow.style.transition = '0.8s';
			findrow.style.opacity = '0';
			document.getElementById("group-table").deleteRow(findrow.rowIndex);
		}, 1000);
		notify(data.body.Msg)
		window.location.reload()
	}

	deleteRow = (e) => {
		let dataindex = e.target.getAttribute('data-id');
		let findrow = document.body.querySelector('[data-row="' + dataindex + '"]');
		let url = GROUP_URL + dataindex + "/";
		deleteRequest(url, this.deleteGroupResponse, authHeaders, findrow)
	}

	getCampaignCategories = (data) => {
		let category_array = []
		let campaign_array = []
		if (data.body.categories) {
			data.body.categories.map((item, index) => {
				let category_dict = {}
				category_dict['value'] = item.id
				category_dict['label'] = item.name
				category_dict['name'] = item.name
				category_array.push(category_dict)
			})
		}

		if (data.body.campaigns) {
			data.body.campaigns.map((item, index) => {
				let campaign_dict = {}
				campaign_dict['value'] = item.id
				campaign_dict['label'] = item.name
				campaign_dict['name'] = item.name
				campaign_array.push(campaign_dict)
			})
		}

		this.setState({
			"categories": category_array,
			"campaigns": campaign_array
		})
	}

	getGroups = (data) => {
		var url = GROUP_URL;
		getRequest(url, this.getGroupsData, authHeaders);
	}

	getGroupsData = (data) => {
		if (!Array.isArray(data.body)) {
			var results = [
				...this.state.results,
				...data.body.results
			]
		} else {
			var results = [
				...this.state.results
			]
		}

		this.setState({
			results: results,
			next: data.body.next,
			previous: data.body.previous,
			loading: false
		})
	}

	getNext = () => {
		this.setState({
			loading: true,
			page: this.state.page + 1
		})
		getRequest(this.state.next, this.getGroupsData, authHeaders);
	}

	handleScroll = () => {
		if ($(window).scrollTop() == $(document).height() - $(window).height()) {
			if (!this.state.loading && this.state.next) {
				this.getNext();
			}
		}
	}

	isSideBarToogle = (data) => {
		if (data === true) {
			this.setState({ isSideOpen: true })
			cookies.set('isSideOpen', true, { path: '/' });
		} else {
			this.setState({ isSideOpen: false })
			cookies.remove('isSideOpen', { path: '/' });
		}
	}

	toggleSwitch = (data) => {
		if (data === true) {
			if (document.getElementById("dark_style")) {
				document.getElementById("dark_style").disabled = false;
			} else {
				var head = document.getElementsByTagName('head')[0];
				var link = document.createElement('link');
				link.id = 'dark_style'
				link.rel = 'stylesheet';
				link.type = 'text/css';
				link.href = '/static/css/dark-style.css';
				link.media = 'all';
				head.appendChild(link);
			}
			this.setState({ isChecked: true })
			cookies.set('isChecked', true, { path: '/' });
		} else {
			if (document.getElementById("dark_style")) {
				document.getElementById("dark_style").disabled = true;
			}
			this.setState({ isChecked: false })
			cookies.remove('isChecked', { path: '/' });
		}
	}

	getTheme = () => {
		if (cookies.get('isChecked')) {
			if (document.getElementById("dark_style")) {
				document.getElementById("dark_style").disabled = false;
			} else {
				var head = document.getElementsByTagName('head')[0];
				var link = document.createElement('link');
				link.id = 'dark_style';
				link.rel = 'stylesheet';
				link.type = 'text/css';
				link.href = '/static/css/dark-style.css';
				link.media = 'all';
				head.appendChild(link);
			}
		} else {
			if (document.getElementById("dark_style")) {
				document.getElementById("dark_style").disabled = true;
			}
		}
	}

	componentDidMount() {
		window.addEventListener('scroll', this.handleScroll, true);
		this.getGroups()
		var campaign_category_url = CATEGORIES_CAMPAIGN_URL;
		getRequest(campaign_category_url, this.getCampaignCategories, authHeaders);
		if (cookies.get('isSideOpen')) {
			this.setState({ isSideOpen: true })
		} else {
			this.setState({ isSideOpen: false })
		}
		if (cookies.get('isChecked')) {
			this.setState({ isChecked: true })
		} else {
			this.setState({ isChecked: false })
		}
		this.getTheme();
	}

	componentWillUnmount = () => {
		window.removeEventListener('scroll', this.handleScroll)
	}

	render() {
		var { menus, isSideOpen, username, isChecked } = this.state

		let result_array = this.state.results
		let results = []

		result_array.map((el, index) => {
			var categories_data = Object.keys(el.category).map(function (x) { return el.category[x].name }).join(", ");
			var data = <tr key={index} data-row={el.id}>
				<th scope="row">{index + 1}</th>
				<td>
					{this.state.rows[el.id] ?
						<React.Fragment>
							<SelectComponent
								options={this.state.categories}
								isMulti={true}
								onChange={(e) => this.handleChange("category", e, true)}
								allowSelectAll={true}
								value={this.state.fields['category']}
							/>
							<FormText color="danger">{this.state.errors["category"]}</FormText>
						</React.Fragment>
						:
						<span>{categories_data}</span>
					}
				</td>
				<td>
					{this.state.rows[el.id] ?
						<React.Fragment>
							<Select value={this.state.fields['campaign']} onChange={(e) => this.handleChange("campaign", e, true)} options={this.state.campaigns} />
							<FormText color="danger">{this.state.errors["campaign"]}</FormText>
						</React.Fragment>
						:
						<span>{el.campaign.name}</span>
					}
				</td>
				{this.state.rows[el.id] ?
					<td><input type="checkbox" name="is_active" checked={el.is_active} onChange={(e) => this.handleChange("is_active", e)} /></td>
					:
					<React.Fragment>
						{el.is_active ?
							<React.Fragment>
								<td className="text-success font-weight-bold">Active</td>
							</React.Fragment>
							:
							<React.Fragment>
								<td className="text-info font-weight-bold">Pause</td>
							</React.Fragment>
						}
					</React.Fragment>
				}
				<td>
					<ul className="list-inline m-0">
						{this.state.rows[el.id] ?
							<React.Fragment>
								<li className="list-inline-item btn btn-sm btn-success" data-id={el.id} onClick={this.submitRow}>Save
								</li>
								<li className="list-inline-item btn btn-sm btn-danger" index={index} data-id={el.id} onClick={this.cancelRow}>Cancel</li>
							</React.Fragment>
							:
							<React.Fragment>
								<li className="list-inline-item btn btn-sm btn-warning" index={index} data-id={el.id} onClick={this.editRow}>Edit</li>
								<li className="list-inline-item btn btn-sm btn-danger" data-id={el.id} onClick={this.deleteRow}>Delete</li>
							</React.Fragment>
						}
					</ul>
				</td>
			</tr>
			results.push(data);
		})

		return (
			<React.Fragment>
				<ToastContainer />
				<div className="group">
					<Menu
						logo={logo}
						navitems={config_data.dashboardmenu}
						isSlider={true}
						isSideBarToogle={this.isSideBarToogle}
						isSideOpen={isSideOpen}
						domain="dashboard"
						username={username}
						toggleSwitch={this.toggleSwitch}
						isChecked={isChecked}
					/>
					<div className="container-fluid">
						<div className="row">
							<SideBar menuitems={config_data.dashboardmenu} class={isSideOpen} domain="dashboard" isChecked={isChecked} />
							<div className={`main-content ${isSideOpen ? 'offset-lg-2 col-lg-10' : 'col-lg-12'}`}>
								<div className="pt-50 mb-3">
									<h1 className="h2">Groups</h1>
									<div className="clearfix">
										<div className="float-left">
											<Button color="success" size="md" onClick={this.toggle}>Add new</Button>
										</div>
										<div className="float-right">
											<Form>
												<Input type="text" name="query" className="form-control" placeholder="search" onChange={this.handleQueryChange} value={this.state.q} onKeyPress={event => { this.handleKeyPress(event) }} />
											</Form>
										</div>
									</div>
								</div>
								<hr />
								<div className="my-5">
									<h5 className="text-info">Total {this.state.results.length} groups</h5>
									<Table striped id="group-table">
										<thead>
											<tr>
												<th style={{ width: "5%" }}>#</th>
												<th style={{ width: "30%" }}>Categories</th>
												<th style={{ width: "25%" }}>Campaign</th>
												<th style={{ width: "20%" }}>Status</th>
												<th style={{ width: "20%" }}></th>
											</tr>
										</thead>
										<tbody>
											{results}
										</tbody>
									</Table>
									{
										this.state.loading ?
											<React.Fragment>
												<div className="lds-ring col-sm-12 col-md-7 offset-md-5"><div></div><div></div><div></div><div></div></div>
											</React.Fragment>
											: ""
									}
								</div>
							</div>
						</div>
					</div>

					<Modal isOpen={this.state.modal} toggle={this.toggle}>
						<ModalHeader toggle={this.toggle}>Add new group</ModalHeader>
						<ModalBody>
							<Form>
								<FormGroup>
									<Label for="category">Select Categories</Label>
									<SelectComponent
										options={this.state.categories}
										isMulti={true}
										onChange={(e) => this.handleChange("category", e)}
										allowSelectAll={true}
										value={this.state.fields['category'] ? this.state.fields['category'].value : ''}
									/>
									<FormText color="danger">{this.state.errors["category"]}</FormText>
								</FormGroup>
								<FormGroup>
									<Label for="campaign">Select Campaign</Label>
									<Select refs="campaign" value={this.state.fields['campaign'] ? this.state.fields['campaign'].value : ''} onChange={(e) => this.handleChange("campaign", e)} options={this.state.campaigns} />
									<FormText color="danger">{this.state.errors["campaign"]}</FormText>
								</FormGroup>
							</Form>
						</ModalBody>
						<ModalFooter>
							<div className="clearfix" style={{ width: "100%" }}>
								<div className="float-left">
									{this.state.formSuccess ?
										<h6 className="text-success m-0">Form submitted successfully.</h6>
										: ""}
								</div>
								<div className="float-right">
									<Button color="success" onClick={this.groupSubmit} type="button">Submit</Button>&nbsp;&nbsp;
									<Button color="secondary" onClick={this.toggle} type="button">Cancel</Button>
								</div>
							</div>
						</ModalFooter>
					</Modal>
				</div>
				<Footer privacyurl="#" facebookurl="#" twitterurl="#" />
			</React.Fragment>
		);
	}
}

ReactDOM.render(<Group />, document.getElementById('root'));
serviceWorker.unregister();

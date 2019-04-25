sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox",
	"sap/m/MessageItem"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox, MessageItem) {
	"use strict";
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.OnChange", {

		/**
		 * perform validation check upon a mandatory combo box field is changed
		 * @public
		 * @param {Object} oEvent - Event object from mandatory field
		 */
		onChangeMandatory: function (oEvent) {
			var oInput = oEvent.getParameter("newValue");
			var oInputControl = oEvent.getSource();
			var key = oEvent.getSource().getSelectedItem();

			if (oInput === "" && key === null) {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
			} else {
				if (key === null) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}
			}
		},

		/**
		 * perform validation check upon a mandatory input field is changed
		 * @public
		 * @param {Object} oEvent - Event object from mandatory fieldd
		 */
		onChangeMandatoryInput: function (oEvent) {
			var oInput = oEvent.getParameter("newValue");
			var oInputControl = oEvent.getSource();

			if (oInput === "") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
			}

		},

		/**
		 * perform validation check upon Month input field is changed
		 * @public
		 * @param {Object} oEvent - Event object from Month Input Field
		 */
		onChangeMonth: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput !== "") {
				if (oInput < 1 || oInput > 12) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}
			}
		},

		/**
		 * perform validation check upon Year input field is changed
		 * @public
		 * @param {Object} oEvent - Event object from Year Input field
		 */
		onChangeYear: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput !== "") {
				if (oInput > 99) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}
			}
		},

		/**
		 * perform validation check upon Scale input field is changed
		 * @public
		 * @param {Object} oEvent - Event object from Scale Input field
		 */
		onChangeScale: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput === "") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
				sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
					message: this.getView().getModel("i18n").getResourceBundle().getText("error.AppliedSideReading"),
					persistent: true,
					type: sap.ui.core.MessageType.Error
				}));
			} else {
				if (oInput < 16 || oInput > 50) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getView().getModel("i18n").getResourceBundle().getText("error.AppliedSideReading"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}
			}
		},

		/**
		 * perform validation check upon mandatory Month input field is changed
		 * @public
		 * @param {Object} oEvent - Event object from Month Input Field
		 */
		onChangeMandatoryMonth: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput === "" || oInput === "00") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				if (oInput !== "") {
					if (oInput < 1 || oInput > 12) {
						oInputControl.setValueState(sap.ui.core.ValueState.Error);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

					} else {
						oInputControl.setValueState(sap.ui.core.ValueState.None);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
					}
				}
			}
		},

		/**
		 * perform validation check upon mandatory Year input field is changed
		 * @public
		 * @param {Object} oEvent - Event object from Month Input Field
		 */
		onChangeMandatoryYear: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput === "" || oInput === "00") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				if (oInput !== "") {
					if (oInput > 99) {
						oInputControl.setValueState(sap.ui.core.ValueState.Error);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

					} else {
						oInputControl.setValueState(sap.ui.core.ValueState.None);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
					}
				}
			}
		},

		/**
		 * perform validation check upon combo box field is changed
		 * @public
		 * @param {Object} oEvent - Event object from combo box
		 */
		onChangeComboBox: function (oEvent) {
			var oInputControl = oEvent.getSource();
			var key = oEvent.getSource().getSelectedItem();
			var newval = oEvent.getParameter("newValue");

			if (newval !== "" && key === null) {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
			}
		},

		/**
		 * perform validation check upon Scale from Removed Wheel Reading input field is changed
		 * @public
		 * @param {Object} oEvent - Event object from Scale Input field
		 */
		onChangeRemScaleRead: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput === "") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
				sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
					message: this.getView().getModel("i18n").getResourceBundle().getText("error.RemovedSideReading"),
					persistent: true,
					type: sap.ui.core.MessageType.Error
				}));

			} else {
				if (oInput !== "") {
					if (oInput === "00" || (oInput >= 10 && oInput <= 50)) {
						oInputControl.setValueState(sap.ui.core.ValueState.None);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
					} else {
						oInputControl.setValueState(sap.ui.core.ValueState.Error);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getView().getModel("i18n").getResourceBundle().getText("error.RemovedSideReading"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}
		}

	});
});
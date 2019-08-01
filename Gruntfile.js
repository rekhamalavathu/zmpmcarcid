module.exports = function (grunt) {
	"use strict";
	// Project configuration.
	grunt.initConfig({
		uglify: {
			options: {
				mangle: true,
				compress: {
					drop_console: true,
					dead_code: false,
					unused: false
				}
			},
			files: {
				expand: true,
				cwd: "<%= ref.staging%>",
				src: ["**/*.js", "!test/**", "!test_local.html"],
				dest: "<%= ref.process%>"
			}
		}
	});

	grunt.loadNpmTasks("@sap/grunt-sapui5-bestpractice-build");
	grunt.registerTask("default", [
		"clean",
		"lint",
		"build",
		"uglify"
	]);
};
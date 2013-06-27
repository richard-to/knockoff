module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        distdir: 'dist',

        srcdir: 'src',

        subdir: {
            atpl: '/templates',
            css: '/static/css',
            img: '/static/img',
            js: '/static/js',
            lib: '/static/lib',
            scss: '/static/scss'
         },

        libpath: {
            backbone: '<%= srcdir %><%= subdir.lib %>/backbone.js',
            jquery: '<%= srcdir %><%= subdir.lib %>/jquery.js',
            underscore: '<%= srcdir %><%= subdir.lib %>/underscore.js',
            bootstrap: {
                css: '<%= srcdir %><%= subdir.lib %>/bootstrap/css/bootstrap.css',
                img: '<%= srcdir %><%= subdir.lib %>/bootstrap/img'
            }
        },

        srcpath: {
            app: '<%= srcdir %>/app.py',
            atpl: '<%= srcdir %><%= subdir.atpl %>/*.html',
            css: '<%= srcdir %><%= subdir.css %>/main.css',
            js: [
                '<%= srcdir %><%= subdir.js %>/**/*.js',
                '!<%= srcdir %><%= subdir.js %>/**/*.spec.js'
            ],
            tpl: '<%= srcdir %><%= subdir.js %>/**/*.tpl.html',
            scss: '<%= srcdir %><%= subdir.scss %>/main.scss',
            unit: '<%= srcdir %><%= subdir.js %>/**/*.spec.js'
        },

        distpath: {
            app: '<%= distdir %>/app.py',
            atpl: '<%= distdir %><%= subdir.atpl %>/*.html',
            css: '<%= distdir %><%= subdir.css %>/main.css',
            js: '<%= distdir %><%= subdir.js %>/main.js',
            tpl: '<%= distdir %><%= subdir.js %>/**/*.tpl.html',
        },

        clean: ['<%= distdir %>'],

        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: '<%= srcdir %>',
                        src: ['*.py', '<%= subdir.atpl %>/*'],
                        dest: '<%= distdir %>/'
                    },
                    {
                        expand: true,
                        cwd: '<%= libpath.bootstrap.img/*',
                        src: ['*'],
                        dest: '<%= distdir %><%= subdir.img %>/'
                    },
                ]
            }
        },

        lint: {
            files: [
                '<%= srcpath.js[0] %>'
            ]
        },

        jshint: {
            src: [
                'Gruntfile.js',
                '<%= srcpath.js %>',
                '<%= srcpath.unit %>'
            ]
        },

        sass: {
            dist: {
                options: {
                    style: 'compressed'
                },
                files: {
                    '<%= distpath.css %>': ['<%= libpath.bootstrap.css %>', '<%= srcpath.scss %>']
                }
            },
            src: {
                options: {
                    style: 'expanded'
                },
                files: {
                    '<%= srcpath.css %>': ['<%= srcpath.scss %>']
                }
            }
        },

        cssmin: {
            minify: {
                expand: true,
                cwd: '<%= srcdir %><%= subdir.css %>',
                src: ['main.css'],
                dest: '<%= distdir %><%= subdir.css %>',
                ext: '.min.css'
            }
        },

        karma: {
            options: {
                runnerPort: 9100,
                browsers: ['Chrome']
            },
            unit: {
                configFile: 'karma.conf.js'
            }
        },

        uglify: {
            dist: {
                files: {
                    '<%= distpath.js %>': [
                        '<%= libpath.jquery %>',
                        '<%= libpath.underscore %>',
                        '<%= libpath.backbone %>',
                        '<%= srcpath.js %>'
                    ]
                }
            }
        },

        watch: {
            options: {
                livereload: true
            },
            css: {
                files: ['<%= srcpath.scss %>'],
                tasks: ['sass:src']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib');
    grunt.loadNpmTasks('grunt-karma');

    grunt.registerTask('default', ['jshint', 'clean', 'copy', 'uglify', 'sass']);
    grunt.registerTask('unit', ['karma']);
};

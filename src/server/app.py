import copy
import json
import os

from datetime import date

from flask import Flask, render_template, request, session

# Application config
# ==================

SECRET_KEY = 'Secret Key'
DEBUG = True

app = Flask(__name__)
app.config.from_object(__name__)


# Fake data store
# ===============

storageUsers = {
	'John Doe': {
		'id': 0,
		'name': 'John Doe',
		'avatar': 'http://www.gravatar.com/avatar/0ab06730a57651a0e965008aac134102?d=identicon&s=40'
	},
	'Jane Doe': {
		'id': 1,
		'name': 'Jane Doe',
		'avatar': 'http://www.gravatar.com/avatar/910db02478c40c6d54962268f613fa22?d=identicon&s=40'
	}
}

storageGoals = [
	{
		'id': 0,
		'name': 'John Doe',
		'goal': 'I want to create a goal',
		'tasks': [
			{'description': 'Task 1', 'completed': False},
			{'description': 'Task 2', 'completed': False},
		],
		'approved': False
	}
]

storageMsg = [
	{
		'id': 0,
		'name': 'John Doe',
		'avatar': 'http://www.gravatar.com/avatar/0ab06730a57651a0e965008aac134102?d=identicon&s=40',
		'msg': 'Hello world!',
		'published': True,
		'publishDate': '6/20/2013',
		'rating': None,
	},
	{
		'id': 1,
		'name': 'Jane Doe',
		'avatar': 'http://www.gravatar.com/avatar/910db02478c40c6d54962268f613fa22?d=identicon&s=40',
		'msg': 'Woe is me...',
		'published': True,
		'publishDate': '7/20/2013',
		'rating': None
	},
]


# Helper methods
# ==============

def save_msg(data):
	msg = copy.deepcopy(data)
	msg['publishDate'] = date.today().strftime("%d/%m/%y")
	del msg['owner']
	if 'id' not in msg:
		msg['id'] = len(storageMsg)
		storageMsg.append(msg)
	else:
		storageMsg[data['id']] = msg
	return msg

def msg_to_view_model(msg, user):
	vm = copy.deepcopy(msg)
	vm['owner'] = (vm['name'] == user['name'])
	vm['collapsed'] = vm['published']
	vm['excerpt'] = ''.join([vm['msg'][:60], '...'])
	return vm

def user_to_view_model(user):
	vm = copy.deepcopy(user)
	vm['isLoggedIn'] = True
	return vm

def goal_to_view_model(goal, user):
	vm = copy.deepcopy(goal)
	vm['owner'] = (vm['name'] == user['name'])
	return vm


# Api endpoints
# =============


# Login api
# ---------

@app.route('/api/users/login', methods=['POST'])
def api_users_login():
	data = json.loads(request.data)
	if data['name'] in storageUsers:
		session['user'] = storageUsers[data['name']]
		session['logged_in'] = True
		return json.dumps(user_to_view_model(session['user']))
	else:
		return json.dumps(data)


# Goal api
# --------
@app.route('/api/goals/<int:goal_id>', methods=['GET'])
def api_goal_get(goal_id):
	return json.dumps(goal_to_view_model(storageGoals[goal_id], session['user']))

@app.route('/api/goals/<int:goal_id>', methods=['PUT'])
def api_goal_update(goal_id):
	data = json.loads(request.data)
	storageGoals[goal_id] = data
	return json.dumps(goal_to_view_model(storageGoals[goal_id], session['user']))

# Msg api
# -------

@app.route('/api/msgs/draft')
def api_msgs_draft():
	draft = None
	for row in storageMsg:
		if session['user']['name'] == row['name'] and row['published'] == False:
			draft = row
			break

	if draft is None:
		draft = {
			'name': session['user']['name'],
			'avatar': session['user']['avatar'],
			'msg': '',
			'published': False,
			'publishDate': date.today().strftime("%d/%m/%y"),
			'rating': None
		}
		draft['id'] = len(storageMsg)
		storageMsg.append(draft)
	return json.dumps(msg_to_view_model(draft, session['user']))

@app.route('/api/msgs/<int:msg_id>/rate', methods=['PATCH'])
def api_msgs_rate(msg_id):
	data = json.loads(request.data)
	storageMsg[msg_id]['rating'] = data['rating']
	return json.dumps(data)

@app.route('/api/msgs/<int:msg_id>/autosave', methods=['PATCH'])
def api_msgs_autosave(msg_id):
	data = json.loads(request.data)
	storageMsg[msg_id]['msg'] = data['msg']
	return json.dumps(data)

@app.route('/api/msgs/<int:msg_id>', methods=['PUT'])
def api_msgs_save(msg_id):
	data = json.loads(request.data)
	msg = save_msg(data)
	data = msg_to_view_model(msg, session['user'])
	data['collapsed'] = False
	return json.dumps(data)

@app.route('/api/msgs', methods=['POST'])
def api_msgs_new():
	data = json.loads(request.data)
	msg = save_msg(data)
	data = msg_to_view_model(msg, session['user'])
	data['collapsed'] = False
	return json.dumps(data)

@app.route('/api/msgs')
def api_msgs():
	data = []
	for row in storageMsg:
		if row['published']:
			data.append(msg_to_view_model(row, session['user']))
	if len(data) > 0:
		data[len(data) - 1]['collapsed'] = False
	return json.dumps(data)


# Main page
# =========

@app.route('/')
def index():
    return render_template('index.html')

def main():
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()
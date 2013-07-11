import json
import os

from flask import Flask, render_template, request


app = Flask(__name__)

storage = [
	{'id': 0, 'name': 'John Doe', 'msg': 'Hello world!', 'published': True},
	{'id': 1, 'name': 'Jane Doe', 'msg': 'Woe is me...', 'published': True}
]

@app.route('/api/msgs/<int:msg_id>', methods=['PUT'])
def api_msgs_save(msg_id):
	data = json.loads(request.data)
	storage[msg_id] = data
	return json.dumps(data)

@app.route('/api/msgs', methods=['POST'])
def api_msgs_new():
	data = json.loads(request.data)
	data['id'] = len(storage)
	storage.append(data)
	return json.dumps(data)

@app.route('/api/msgs')
def api_msgs():
	data = []
	for row in storage:
		if row['published']:
			data.append(row)
	return json.dumps(data)

@app.route('/')
def index():
    return render_template('index.html')

def main():
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()
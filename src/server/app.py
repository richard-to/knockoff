import json
import os

from flask import Flask, render_template, request


app = Flask(__name__)

storage = [
	{'name': 'John Doe', 'msg': 'Hello world!'},
	{'name': 'Jane Doe', 'msg': 'Woe is me...'}
]

@app.route('/api/msgs', methods=['POST'])
def api_msgs_save():
	data = json.loads(request.data)
	storage.append(data)
	return json.dumps(data)

@app.route('/api/msgs')
def api_msgs():
	return json.dumps(storage)

@app.route('/')
def index():
    return render_template('index.html')

def main():
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()
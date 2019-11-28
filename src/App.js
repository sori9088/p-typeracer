import React from "react";

import Clock from "./components/Clock";
import Footer from "./components/Footer";
import TextInput from "./components/TextInput";
import TextDisplay from "./components/TextDisplay";

require("./sass/app.scss");
require("./font-awesome/css/font-awesome.css");

class App extends React.Component {
  constructor(props) {
    super(props);

    const existingToken = sessionStorage.getItem("token");
    const accessToken =
      window.location.search.split("=")[0] === "?api_key"
        ? window.location.search.split("=")[1]
        : null;
    if (!accessToken && !existingToken) {
      window.location.replace(`https://127.0.0.1:5000`);
    }
    
    if (accessToken) {
      sessionStorage.setItem("token", accessToken)
    }

    this.state = {
      token: existingToken || accessToken,
      wpm: 0,
      index: 0,
      value: "",
      // token: "",
      error: false,
      errorCount: 0,
      timeElapsed: 0,
      lineView: false,
      startTime: null,
      completed: false,
      excerpt: '',
      results : null,
      user: null
    };
  }

  async componentDidMount() {
    this.intervals = [];
    this.getExcerpts()
    this.getUserInfo()
  }



  setInterval() {
    this.intervals.push(setInterval.apply(null, arguments));
  }

  _randomElement = array => {
    return array[
      Math.floor(Math.random() * array.length)
    ];
  };

  _handleInputChange = e => {
    if (this.state.completed) return;

    let inputVal = e.target.value;
    let index = this.state.index;
    if (this.state.excerpt.slice(index, index + inputVal.length) === inputVal) {
      if (inputVal.slice(-1) === " " && !this.state.error) {
        this.setState({
          value: "",
          index: this.state.index + inputVal.length
        });
      } else if (index + inputVal.length === this.state.excerpt.length) {
        this.setState(
          {
            value: "",
            completed: true
          },function() {
          this._calculateWPM();
          });
          this.intervals.map(clearInterval);
      } else {
        this.setState({
          error: false,
          value: inputVal
        });
      }
    } else {
      this.setState({
        error: true,
        value: inputVal,
        errorCount: this.state.error
          ? this.state.errorCount
          : this.state.errorCount + 1
      });
    }
  };

  _changeView = e => {
    this.setState({ lineView: !this.state.lineView });
  };

  _restartGame = () => {
    let temp = this._randomElement(this.state.excerpts)
    this.setState(
      {
        wpm: 0,
        index: 0,
        value: "",
        token:"22",
        error: false,
        errorCount: 0,
        timeElapsed: 0,
        lineView: false,
        startTime: null,
        completed: false,
        excerpt: temp.body,
        excerptId: temp.id
      },
      () => this.intervals.map(clearInterval)
    );
  };

  _setupIntervals = () => {
    this.setState(
      {
        startTime: new Date().getTime()
      },
      () => {
        this.setInterval(() => {
          this.setState({
            timeElapsed: new Date().getTime() - this.state.startTime
          });
        }, 50);
        this.setInterval(this._calculateWPM, 1000);
      }
    );
  };


  async getUserInfo(){
    const res = await fetch(`https://127.0.0.1:5000/getuser`, {
      headers: {
        "Content-Type" : "application/json",
        "Authorization" : `Token ${this.state.token}`
      }
    })
    if (res.ok){
      const data = await res.json()
      this.setState({user : data})
    }
  }


  postScore = async (wpm, elapsed) => {
    const resp = await fetch("https://127.0.0.1:5000/scores", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization' : `Token ${this.state.token}`
      },
      body: JSON.stringify({
        excerpt_id: this.state.excerptId,
        wpm,
        time: elapsed,
        errorCount: this.state.errorCount
      })
    });
    const data = await resp.json();
    console.log(resp)
    if (resp.ok) {
      console.log(
        data
      )
      this.setState({ results : data })
    } else {
      this.setState({ error: "Could not post score" });
    }
  };

  async doLogout() {
    const res = await fetch('https://127.0.0.1:5000/logout', {
      headers : {
        "Content-Type": "application/json",
        "Authorization": `Token ${this.state.token}`
      }
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success === true) {
        sessionStorage.clear('token')
        this.setState({
          user:null,
          token:null
        })
      }
    }
  }

  _calculateWPM = () => {
    const elapsed = new Date().getTime() - this.state.startTime;
    let wpm;
    if (this.state.completed) {
      wpm = (this.state.excerpt.split(" ").length / (elapsed / 1000)) * 60;
      this.postScore(wpm, elapsed);
    } else {
      let words = this.state.excerpt.slice(0, this.state.index).split(" ")
        .length;
      wpm = (words / (elapsed / 1000)) * 60;
    }
    this.setState({
      wpm: this.state.completed ? Math.round(wpm * 10) / 10 : Math.round(wpm)
    });
  };

  getExcerpts = async () => {
    const response = await fetch("https://127.0.0.1:5000/excerpts");
    const res = await response.json()
    console.log(res)

    if (response.ok){
      let tempExcerpt = this._randomElement(res) // a random object of excerpt and ID from array 'res'
    this.setState({
      excerpts : res,
      excerpt:tempExcerpt.body,
      excerptId: tempExcerpt.id
    })
    } else {
      console.log(response.error)
    }
  };

  renderGame = () => {
    return (
      <>
        <TextDisplay
          index={this.state.index}
          error={this.state.error}
          lineView={this.state.lineView}
        >
          {this.state.excerpt}
        </TextDisplay>
        <TextInput
          error={this.state.error}
          value={this.state.value}
          started={!!this.state.startTime}
          setupIntervals={this._setupIntervals}
          onInputChange={this._handleInputChange}
        />
        <div className={this.state.completed ? "stats completed" : "stats"}>
          <Clock elapsed={this.state.timeElapsed} />
          <span className="wpm">{this.state.wpm}</span>
          <span className="errors">{this.state.errorCount}</span>
        </div>
        <div>

    {this.state.results && this.state.results.excerpt.scores.top.map((result)=> <>
    <div className="d-flex justify-content-around">
    <span>User_id : {result.user_id}<br /></span>
    <span>Score : {result.wpm}<br /></span>
    <span>Time : {result.time}<br /><br /></span>
    </div>
    </>
    )}
        </div>
      </>
    )
  }



  render() {
    console.log(this.state.user, 'hansol')
    if (!this.state.user) return <a href="https://127.0.0.1:5000/login/facebook">Login with fb</a>
        return (
      <>
      <button onClick={()=>this.doLogout()}>Log Out</button>
        <div className="header">
          <h1>Type Racing</h1>
          <i onClick={this._restartGame} className="fa fa-lg fa-refresh"></i>
          <i className="fa fa-lg fa-bars" onClick={this._changeView}></i>
        </div>
        {this.state.token && this.state.token.length > 1 ? this.renderGame() :  this.renderGame()} 
        <Footer />
      </>
    );
  }
}

export default App;

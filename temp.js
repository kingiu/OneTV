async getMembershipInfo(): Promise<MembershipResponse> {
    const response = await this._fetch("/api/membership");
    const data = await response.json();
    return data.data;
  }
